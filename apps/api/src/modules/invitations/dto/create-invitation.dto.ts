import { Transform } from 'class-transformer';
import { MembershipRole } from '@prisma/client';
import { IsEmail, IsEnum } from 'class-validator';

export class CreateInvitationDto {
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: 'Invalid email address.' })
  email!: string;

  @IsEnum(MembershipRole)
  role!: MembershipRole;
}
