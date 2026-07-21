import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../decorators/current-user.decorator';
import { LoginDto } from '../dto/login.dto';
import { RefreshDto } from '../dto/refresh.dto';
import { RegisterDto } from '../dto/register.dto';
import { SwitchOrganizationDto } from '../dto/switch-organization.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() currentUser: JwtPayload) {
    return this.authService.logout(currentUser.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getCurrentUser(@CurrentUser() currentUser: JwtPayload) {
    return this.authService.getCurrentUser(currentUser.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('switch-organization')
  switchOrganization(
    @CurrentUser() currentUser: JwtPayload,
    @Body() switchOrganizationDto: SwitchOrganizationDto,
  ) {
    return this.authService.switchOrganization(
      currentUser.sub,
      switchOrganizationDto,
    );
  }
}