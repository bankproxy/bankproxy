import {
  DataTypes,
  HasManyCreateAssociationMixin,
  Model,
  Sequelize,
} from "sequelize";
import {
  randomBytesAsync,
  randomHexBytesAsync,
  scryptAsync,
} from "./Utilities";

const CLIENT_ID_LEN = 16;
const CLIENT_SECRET_LEN = 16;
const CLIENT_SECRET_HASH_LEN = 64;
const CLIENT_SECRET_SALT_LEN = 16;

function generateClientId() {
  return randomHexBytesAsync(CLIENT_ID_LEN);
}

function generateClientSecret() {
  return randomHexBytesAsync(CLIENT_SECRET_LEN);
}

function generateClientSecretSalt() {
  return randomBytesAsync(CLIENT_SECRET_SALT_LEN);
}

export function createModel(uri: string) {
  const sequelize = new Sequelize(uri, { logging: false });

  class Connector extends Model {
    public type?: string;
    public name?: string;
    public clientId!: string;
    public clientSecretSalt!: Buffer;
    public clientSecretHash!: Buffer;
    public clientSecret?: string;
    public lastUsedAt?: Date;
    public lastSuccededAt?: Date;
    public createdAt?: Date;
    public updatedAt?: Date;

    public readonly ConnectorConfigs?: ConnectorConfig[];
    public readonly ConnectorUsers?: ConnectorUser[];

    public createConnectorConfig!: HasManyCreateAssociationMixin<ConnectorConfig>;
    public createConnectorUser!: HasManyCreateAssociationMixin<ConnectorUser>;

    async hashClientSecret(password: string) {
      return scryptAsync(
        password,
        this.clientSecretSalt,
        CLIENT_SECRET_HASH_LEN
      ) as Promise<Buffer>;
    }

    async checkClientSecret(password: string) {
      const hash = await this.hashClientSecret(password);
      return hash.equals(this.clientSecretHash);
    }
  }

  Connector.init(
    {
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
      },
      clientId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      clientSecretSalt: {
        type: DataTypes.BLOB,
        allowNull: false,
      },
      clientSecretHash: {
        type: DataTypes.BLOB,
        allowNull: false,
      },
      lastUsedAt: {
        type: DataTypes.DATE,
      },
      lastSuccededAt: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
    }
  );

  Connector.beforeValidate(async (connector) => {
    if (!connector.clientId) {
      connector.clientId = await generateClientId();
    }
    if (!connector.clientSecretHash) {
      connector.clientSecret = await generateClientSecret();
      connector.clientSecretSalt = await generateClientSecretSalt();
      connector.clientSecretHash = await connector.hashClientSecret(
        connector.clientSecret
      );
    }
  });

  class ConnectorConfig extends Model {
    public name!: string;
    public cipher!: Buffer;
  }

  ConnectorConfig.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      cipher: {
        type: DataTypes.BLOB,
        allowNull: false,
      },
    },
    {
      sequelize,
    }
  );

  class ConnectorUser extends Model {
    public user!: string;
  }

  ConnectorUser.init(
    {
      user: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      timestamps: false,
    }
  );

  ConnectorConfig.belongsTo(Connector);
  Connector.hasMany(ConnectorConfig, {
    onDelete: "cascade",
    foreignKey: { allowNull: false },
    hooks: true,
  });
  ConnectorUser.belongsTo(Connector);
  Connector.hasMany(ConnectorUser, {
    onDelete: "cascade",
    foreignKey: { allowNull: false },
    hooks: true,
  });

  return {
    Connector,
    ConnectorConfig,
    ConnectorUser,
    init() {
      return sequelize.sync({ force: true });
    },
  };
}

export type CreatedModel = ReturnType<typeof createModel>;
export type Connector = InstanceType<CreatedModel["Connector"]>;
export type ConnectorConfig = InstanceType<CreatedModel["ConnectorConfig"]>;
export type ConnectorUser = InstanceType<CreatedModel["ConnectorUser"]>;
