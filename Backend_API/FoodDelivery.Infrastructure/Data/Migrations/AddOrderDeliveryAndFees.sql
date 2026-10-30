ALTER TABLE "Orders" ADD "DeliveryAddress" NVARCHAR2(1000)
/

ALTER TABLE "Orders" ADD "DeliveryNotes" NVARCHAR2(500)
/

ALTER TABLE "Orders" ADD "DeliverySlot" NVARCHAR2(20)
/

ALTER TABLE "Orders" ADD "LeaveAtDoorstep" NUMBER(1) DEFAULT 0 NOT NULL
/

ALTER TABLE "Orders" ADD "RecipientName" NVARCHAR2(150)
/

ALTER TABLE "Orders" ADD "RecipientPhone" NVARCHAR2(20)
/

ALTER TABLE "Orders" ADD "ShippingFee" decimal(18,2) DEFAULT 0.0 NOT NULL
/

ALTER TABLE "Orders" ADD "TipAmount" decimal(18,2) DEFAULT 0.0 NOT NULL
/

ALTER TABLE "Orders" ADD "ToteDeposit" decimal(18,2) DEFAULT 0.0 NOT NULL
/

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES (N'20261030044921_AddOrderDeliveryAndFees', N'8.0.3')
/

