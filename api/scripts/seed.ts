import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { defaultModulesForSegment } from '../src/companies/company-modules';
import { db, pool } from '../src/database/drizzle';
import { branches, branchUsers } from '../src/database/schema/branches.schema';
import { companies, companyEnabledModules, companyUsers } from '../src/database/schema/companies.schema';
import { products } from '../src/database/schema/products.schema';
import { branchStocks } from '../src/database/schema/stock.schema';
import { users } from '../src/database/schema/users.schema';

async function seed() {
  if (process.env.NODE_ENV === 'production')
    throw new Error('O seed demonstrativo não pode rodar em produção');
  const email = 'demo@erp.local';
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) {
    console.log('Dados demonstrativos já existem: demo@erp.local');
    return;
  }
  await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({ name: 'Administrador Demo', email, passwordHash: await bcrypt.hash('Demo1234!', 10) }).returning();
    const [company] = await tx.insert(companies).values({ name: 'Mercado Demonstração', segment: 'market', size: 'small' }).returning();
    await tx.insert(companyUsers).values({ companyId: company.id, userId: user.id, role: 'owner' });
    await tx.insert(companyEnabledModules).values(defaultModulesForSegment('market').map((module) => ({ companyId: company.id, module })));
    const [branch] = await tx.insert(branches).values({ companyId: company.id, name: 'Matriz', code: 'MATRIZ', isHeadquarters: true }).returning();
    await tx.insert(branchUsers).values({ branchId: branch.id, userId: user.id });
    const createdProducts = await tx.insert(products).values([
      { companyId: company.id, name: 'Café 500g', sku: 'CAFE-500G', barcode: '7890000000011', salePrice: '18.90', costPrice: '11.00', minimumStock: '5.000' },
      { companyId: company.id, name: 'Leite integral 1L', sku: 'LEITE-1L', barcode: '7890000000028', salePrice: '5.99', costPrice: '3.80', minimumStock: '10.000' },
      { companyId: company.id, name: 'Arroz 5kg', sku: 'ARROZ-5KG', barcode: '7890000000035', salePrice: '31.50', costPrice: '23.00', minimumStock: '4.000' },
    ]).returning();
    await tx.insert(branchStocks).values(createdProducts.map((product, index) => ({ branchId: branch.id, productId: product.id, quantity: ['20.000', '40.000', '12.000'][index] })));
  });
  console.log('Demo criada: demo@erp.local / Demo1234!');
}

void seed().finally(() => pool.end());
