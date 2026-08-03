import { Global, Module } from '@nestjs/common';

import { EMAIL_SERVICE, INVITATION_EMAIL_SERVICE } from './email.tokens';
import { ConsoleEmailProvider } from './providers/console-email.provider';
import { LocalEmailProvider } from './providers/local-email.provider';

@Global()
@Module({
  providers: [
    ConsoleEmailProvider,
    LocalEmailProvider,
    {
      provide: EMAIL_SERVICE,
      useExisting: ConsoleEmailProvider,
    },
    {
      provide: INVITATION_EMAIL_SERVICE,
      useExisting: LocalEmailProvider,
    },
  ],
  exports: [EMAIL_SERVICE, INVITATION_EMAIL_SERVICE],
})
export class EmailModule {}
