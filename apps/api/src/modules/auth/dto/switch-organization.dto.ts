import { IsNotEmpty, IsString } from 'class-validator';

export class SwitchOrganizationDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;
}
