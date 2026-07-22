export class UserResponseDto {
  id!: string;

  email!: string;

  firstName!: string;

  lastName!: string;

  avatarUrl!: string | null;

  phone!: string | null;

  jobTitle!: string | null;

  bio!: string | null;

  timezone!: string | null;

  language!: string | null;

  status!: string;

  emailVerifiedAt!: Date | null;

  lastLoginAt!: Date | null;

  createdAt!: Date;

  updatedAt!: Date;
}
