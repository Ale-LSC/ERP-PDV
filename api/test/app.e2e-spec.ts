import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { pool } from '../src/database/drizzle';

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

describe('ERP-PDV critical flow (e2e)', () => {
  let app: INestApplication<App>;
  const email = `mvp-${Date.now()}@example.com`;
  const password = 'MvpPassword123!';
  let companyId: string;
  let branchId: string;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  it('reports API and database health', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ api: 'ok', database: 'connected' });
  });

  it('onboards a company and authenticates its owner', async () => {
    const onboarding = await request(app.getHttpServer())
      .post('/onboarding')
      .send({
        adminName: 'Usuário MVP',
        adminEmail: email,
        password,
        companyName: 'Empresa MVP',
        segment: 'market',
        size: 'small',
      })
      .expect(201);
    companyId = onboarding.body.company.id as string;
    branchId = onboarding.body.branch.id as string;

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    token = login.body.accessToken as string;

    const companies = await request(app.getHttpServer())
      .get('/companies')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(companies.body[0].modules).toEqual(
      expect.arrayContaining(['products', 'inventory', 'pdv', 'cash']),
    );
  });

  it('creates stock, opens cash and completes a sale', async () => {
    const productResponse = await request(app.getHttpServer())
      .post(`/companies/${companyId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Branch-Id', branchId)
      .send({
        name: 'Produto E2E',
        salePrice: 10,
        costPrice: 4,
        stockQuantity: 5,
        minimumStock: 1,
      })
      .expect(201);
    const productId = productResponse.body.id as string;

    const cashResponse = await request(app.getHttpServer())
      .post(`/companies/${companyId}/cash-sessions/open`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Branch-Id', branchId)
      .send({ openingAmount: 100 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/companies/${companyId}/sales`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Branch-Id', branchId)
      .send({
        cashSessionId: cashResponse.body.id,
        items: [{ productId, quantity: 2 }],
        discount: 0,
        payments: [{ method: 'cash', amount: 20, receivedAmount: 20 }],
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.total).toBe('20.00');
      });

    const products = await request(app.getHttpServer())
      .get(`/companies/${companyId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Branch-Id', branchId)
      .expect(200);
    expect(products.body[0].stockQuantity).toBe('3.000');
  });

  afterAll(async () => {
    await pool.query('delete from sales where company_id = $1', [companyId]);
    await pool.query('delete from companies where id = $1', [companyId]);
    await pool.query('delete from users where email = $1', [email]);
    await app.close();
  });
});
