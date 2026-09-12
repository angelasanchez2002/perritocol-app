-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "locationId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sausageCount" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    CONSTRAINT "ProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantityPerUnit" REAL NOT NULL,
    CONSTRAINT "Recipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Recipe_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailySale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "locationId" TEXT NOT NULL,
    "cajaTipo" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailySale_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DailySale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "locationId" TEXT NOT NULL,
    "cajaTipo" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankTransfer_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashClosing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "locationId" TEXT NOT NULL,
    "cajaTipo" TEXT NOT NULL,
    "employeeId" TEXT,
    "countedCash" REAL NOT NULL,
    "difference" REAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashClosing_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashClosing_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "scope" TEXT NOT NULL,
    "locationId" TEXT,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "locationId" TEXT,
    "payPerShift" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Employee_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayrollWeek" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "basePay" REAL NOT NULL,
    CONSTRAINT "PayrollWeek_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayrollDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payrollWeekId" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "worked" BOOLEAN NOT NULL DEFAULT true,
    "valeAmount" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "PayrollDay_payrollWeekId_fkey" FOREIGN KEY ("payrollWeekId") REFERENCES "PayrollWeek" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Loan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoanPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanId" TEXT NOT NULL,
    "payrollWeekId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoanPayment_payrollWeekId_fkey" FOREIGN KEY ("payrollWeekId") REFERENCES "PayrollWeek" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WarehouseWeek" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ingredientId" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "openingQty" REAL NOT NULL,
    "openingAvgCost" REAL NOT NULL,
    "purchasedQty" REAL NOT NULL DEFAULT 0,
    "purchaseUnitCost" REAL,
    "avgUnitCost" REAL NOT NULL,
    "internalUseQty" REAL NOT NULL DEFAULT 0,
    "closingQtyCalc" REAL NOT NULL,
    "closingQtyCounted" REAL,
    "isPhysicalCount" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "WarehouseWeek_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WarehouseDispatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "warehouseWeekId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    CONSTRAINT "WarehouseDispatch_warehouseWeekId_fkey" FOREIGN KEY ("warehouseWeekId") REFERENCES "WarehouseWeek" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WarehouseDispatch_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ingredientId" TEXT NOT NULL,
    "targetQty" REAL NOT NULL,
    CONSTRAINT "StockTarget_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LocalInventoryCount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "closingQty" REAL NOT NULL,
    CONSTRAINT "LocalInventoryCount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LocalInventoryCount_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ProductPrice_productId_effectiveFrom_idx" ON "ProductPrice"("productId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_productId_ingredientId_key" ON "Recipe"("productId", "ingredientId");

-- CreateIndex
CREATE INDEX "DailySale_locationId_date_cajaTipo_idx" ON "DailySale"("locationId", "date", "cajaTipo");

-- CreateIndex
CREATE INDEX "BankTransfer_locationId_date_cajaTipo_idx" ON "BankTransfer"("locationId", "date", "cajaTipo");

-- CreateIndex
CREATE UNIQUE INDEX "CashClosing_locationId_date_cajaTipo_key" ON "CashClosing"("locationId", "date", "cajaTipo");

-- CreateIndex
CREATE INDEX "Expense_date_locationId_idx" ON "Expense"("date", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollWeek_employeeId_weekStart_key" ON "PayrollWeek"("employeeId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollDay_payrollWeekId_dayOfWeek_key" ON "PayrollDay"("payrollWeekId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseWeek_ingredientId_weekStart_key" ON "WarehouseWeek"("ingredientId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseDispatch_warehouseWeekId_locationId_dayOfWeek_key" ON "WarehouseDispatch"("warehouseWeekId", "locationId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "StockTarget_ingredientId_key" ON "StockTarget"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalInventoryCount_locationId_ingredientId_weekStart_key" ON "LocalInventoryCount"("locationId", "ingredientId", "weekStart");
