CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

CREATE TABLE tenants (
    "Id" uuid NOT NULL,
    "Name" character varying(150) NOT NULL,
    "Code" character varying(80) NOT NULL,
    "IsActive" boolean NOT NULL,
    "CreatedAtUtc" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_tenants" PRIMARY KEY ("Id")
);

CREATE TABLE users (
    "Id" uuid NOT NULL,
    "FullName" character varying(150) NOT NULL,
    "Email" character varying(150) NOT NULL,
    "PasswordHash" character varying(500) NOT NULL,
    "Role" integer NOT NULL,
    "TenantId" uuid NOT NULL,
    "CreatedAtUtc" timestamp with time zone NOT NULL,
    "UpdatedAtUtc" timestamp with time zone,
    "CreatedBy" uuid,
    "UpdatedBy" uuid,
    "IsActive" boolean NOT NULL,
    "InactivatedAtUtc" timestamp with time zone,
    CONSTRAINT "PK_users" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_users_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE RESTRICT
);

CREATE TABLE cells (
    "Id" uuid NOT NULL,
    "Name" character varying(120) NOT NULL,
    "LeaderId" uuid NOT NULL,
    "MeetingDay" integer NOT NULL,
    "MeetingTime" time without time zone NOT NULL,
    "Neighborhood" character varying(120) NOT NULL,
    "City" character varying(120) NOT NULL,
    "TenantId" uuid NOT NULL,
    "CreatedAtUtc" timestamp with time zone NOT NULL,
    "UpdatedAtUtc" timestamp with time zone,
    "CreatedBy" uuid,
    "UpdatedBy" uuid,
    "IsActive" boolean NOT NULL,
    "InactivatedAtUtc" timestamp with time zone,
    CONSTRAINT "PK_cells" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_cells_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_cells_users_LeaderId" FOREIGN KEY ("LeaderId") REFERENCES users ("Id") ON DELETE RESTRICT
);

CREATE TABLE members (
    "Id" uuid NOT NULL,
    "FullName" character varying(150) NOT NULL,
    "BirthDate" date NOT NULL,
    "Phone" character varying(25),
    "Email" character varying(150),
    "AddressStreet" character varying(180),
    "AddressNeighborhood" character varying(120),
    "AddressCity" character varying(120),
    "LeaderId" uuid NOT NULL,
    "CellId" uuid NOT NULL,
    "TenantId" uuid NOT NULL,
    "CreatedAtUtc" timestamp with time zone NOT NULL,
    "UpdatedAtUtc" timestamp with time zone,
    "CreatedBy" uuid,
    "UpdatedBy" uuid,
    "IsActive" boolean NOT NULL,
    "InactivatedAtUtc" timestamp with time zone,
    CONSTRAINT "PK_members" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_members_cells_CellId" FOREIGN KEY ("CellId") REFERENCES cells ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_members_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_members_users_LeaderId" FOREIGN KEY ("LeaderId") REFERENCES users ("Id") ON DELETE RESTRICT
);

CREATE INDEX "IX_cells_LeaderId" ON cells ("LeaderId");

CREATE INDEX "IX_cells_TenantId_Name" ON cells ("TenantId", "Name");

CREATE INDEX "IX_members_CellId" ON members ("CellId");

CREATE INDEX "IX_members_LeaderId" ON members ("LeaderId");

CREATE INDEX "IX_members_TenantId_BirthDate" ON members ("TenantId", "BirthDate");

CREATE INDEX "IX_members_TenantId_FullName" ON members ("TenantId", "FullName");

CREATE UNIQUE INDEX "IX_tenants_Code" ON tenants ("Code");

CREATE UNIQUE INDEX "IX_users_TenantId_Email" ON users ("TenantId", "Email");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260512121408_InitialCreate', '8.0.4');

COMMIT;

