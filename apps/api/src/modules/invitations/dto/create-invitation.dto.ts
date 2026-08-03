import { Transform } from 'class-transformer';
import { MembershipRole } from '@prisma/client';
import { IsEmail, IsEnum, IsIn } from 'class-validator';

/** Owner cannot be invited — ownership is created at registration / transfer only. */
const INVITABLE_ROLES = [
  MembershipRole.ADMIN,
  MembershipRole.MEMBER,
  MembershipRole.VIEWER,
] as const;

export class CreateInvitationDto {
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: 'Invalid email address.' })
  email!: string;

  @IsEnum(MembershipRole)
  @IsIn(INVITABLE_ROLES, {
    message: 'Invalid role. Owner cannot be invited.',
  })
  role!: MembershipRole;
}
