import { Injectable } from '@nestjs/common';
import { db } from '../database/drizzle';
import { users } from '../database/schema/users.schema';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  async findAll() {
    const result = await db.select().from(users);

    return result.map(({ passwordHash, ...user }) => user);
  }

  async create(createUserDto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const [user] = await db
      .insert(users)
      .values({
        name: createUserDto.name,
        email: createUserDto.email,
        passwordHash,
      })
      .returning();

    const { passwordHash: _, ...safeUser } = user;

    return safeUser;
  }
}