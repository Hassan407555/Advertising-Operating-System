export type ConnectMetaPayload = {
  storeId?: string;
};

export type ConnectMetaResponse = {
  authorizationUrl: string;
};

export type MetaConnection = {
  id: string;
  platform: string;
  accountId: string;
  accountName: string;
  status: string;
  syncStatus: string;
  connected: boolean;
  scopes: string[];
  expiresAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MetaBusiness = {
  id: string;
  name: string;
};

export type MetaRemoteAdAccount = {
  id: string;
  accountId: string;
  name: string;
  currency: string | null;
  timezoneName: string | null;
  accountStatus: number | null;
  localAdAccountId: string | null;
};

export type MetaPage = {
  id: string;
  name: string;
  category: string | null;
};

export type MetaInstagramAccount = {
  id: string;
  username: string | null;
  name: string | null;
  pageId: string | null;
};

export type MetaPixel = {
  id: string;
  name: string;
};

export type MetaCatalog = {
  id: string;
  name: string;
};
