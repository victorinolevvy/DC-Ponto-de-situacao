-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('Gestor', 'Director', 'Admin');

-- CreateEnum
CREATE TYPE "TipoProjeto" AS ENUM ('FV', 'Hidrica', 'MiniRede', 'Outro');

-- CreateEnum
CREATE TYPE "EstadoProjeto" AS ENUM ('EmCurso', 'Concluido', 'Parado');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('Civil', 'Rede', 'BESS', 'Fiscalizacao', 'Fornecimento');

-- CreateEnum
CREATE TYPE "TipoMarco" AS ENUM ('Consignacao', 'AutoInicio', 'Vistoria', 'PrevFim', 'Fecho');

-- CreateEnum
CREATE TYPE "PrazoStatus" AS ENUM ('NoPrazo', 'Atrasado', 'Concluido');

-- CreateTable
CREATE TABLE "Provincia" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provincia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Distrito" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "provinciaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Distrito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostoAdm" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "distritoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostoAdm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Projeto" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipoProjeto" "TipoProjeto" NOT NULL,
    "provinciaId" INTEGER NOT NULL,
    "distritoId" INTEGER,
    "postoAdmId" INTEGER,
    "chaveNaMao" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DECIMAL(11,8),
    "longitude" DECIMAL(11,8),
    "estado" "EstadoProjeto" NOT NULL DEFAULT 'EmCurso',
    "valorGlobalMT" DECIMAL(16,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Projeto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" SERIAL NOT NULL,
    "projetoId" INTEGER NOT NULL,
    "tipoContrato" "TipoContrato" NOT NULL,
    "empresa" TEXT NOT NULL,
    "valorContratoMT" DECIMAL(16,2),
    "dataInicio" TIMESTAMP(3),
    "dataPrevistaFim" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Marco" (
    "id" SERIAL NOT NULL,
    "projetoId" INTEGER NOT NULL,
    "tipo" "TipoMarco" NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Marco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatorioQuinzenal" (
    "id" SERIAL NOT NULL,
    "projetoId" INTEGER NOT NULL,
    "contratoId" INTEGER,
    "dataRef" TIMESTAMP(3) NOT NULL,
    "execFisicaPct" DECIMAL(5,2),
    "execFinanceiraPct" DECIMAL(5,2),
    "prazo" "PrazoStatus" NOT NULL,
    "risco" TEXT,
    "mitigacao" TEXT,
    "autorUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelatorioQuinzenal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Utilizador" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "hashSenha" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilizador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Provincia_nome_key" ON "Provincia"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Distrito_nome_provinciaId_key" ON "Distrito"("nome", "provinciaId");

-- CreateIndex
CREATE UNIQUE INDEX "PostoAdm_nome_distritoId_key" ON "PostoAdm"("nome", "distritoId");

-- CreateIndex
CREATE UNIQUE INDEX "Utilizador_email_key" ON "Utilizador"("email");

-- AddForeignKey
ALTER TABLE "Distrito" ADD CONSTRAINT "Distrito_provinciaId_fkey" FOREIGN KEY ("provinciaId") REFERENCES "Provincia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostoAdm" ADD CONSTRAINT "PostoAdm_distritoId_fkey" FOREIGN KEY ("distritoId") REFERENCES "Distrito"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projeto" ADD CONSTRAINT "Projeto_provinciaId_fkey" FOREIGN KEY ("provinciaId") REFERENCES "Provincia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projeto" ADD CONSTRAINT "Projeto_distritoId_fkey" FOREIGN KEY ("distritoId") REFERENCES "Distrito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projeto" ADD CONSTRAINT "Projeto_postoAdmId_fkey" FOREIGN KEY ("postoAdmId") REFERENCES "PostoAdm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Marco" ADD CONSTRAINT "Marco_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatorioQuinzenal" ADD CONSTRAINT "RelatorioQuinzenal_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatorioQuinzenal" ADD CONSTRAINT "RelatorioQuinzenal_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatorioQuinzenal" ADD CONSTRAINT "RelatorioQuinzenal_autorUserId_fkey" FOREIGN KEY ("autorUserId") REFERENCES "Utilizador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

