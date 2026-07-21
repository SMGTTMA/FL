import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CryptoController } from './crypto.controller';
import { CryptoService } from './crypto.service';

@Module({
  imports: [ConfigModule],
  controllers: [CryptoController],
  providers: [CryptoService],
  exports: [CryptoService]
})
export class CryptoModule {}