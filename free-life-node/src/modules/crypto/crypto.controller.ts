import { Controller, Post, Body, Get } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { Public } from '@/common/decorators/public.decorator';

@Controller('crypto')
export class CryptoController {
  constructor(private readonly cryptoService: CryptoService) {}

  /**
   * 获取 RSA 公钥
   * @returns PEM 格式的公钥
   */
  @Public()
  @Post('public-key')
  getPublicKey() {
    return this.cryptoService.getPublicKey();
  }
}
