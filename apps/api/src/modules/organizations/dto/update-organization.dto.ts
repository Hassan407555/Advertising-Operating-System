import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug may only contain lowercase letters, numbers and hyphens.',
  })
  slug?: string;
}
