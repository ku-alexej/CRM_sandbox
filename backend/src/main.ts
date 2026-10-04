import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.modules';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors();
    await app.listen(3000);
}

bootstrap();
