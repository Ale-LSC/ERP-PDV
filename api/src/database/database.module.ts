import { Global, Module, OnModuleDestroy } from '@nestjs/common';
import { pool } from './drizzle';

class DatabaseLifecycle implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    await pool.end();
  }
}

@Global()
@Module({
  providers: [DatabaseLifecycle],
})
export class DatabaseModule {}
