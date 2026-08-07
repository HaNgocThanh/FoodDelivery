using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewOrderIdAndOrderDetailIsReviewed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add IsReviewed to OrderDetails only if it doesn't exist (case-insensitive check)
            migrationBuilder.Sql(@"
                DECLARE
                    col_exists NUMBER := 0;
                BEGIN
                    SELECT COUNT(*) INTO col_exists
                    FROM USER_TAB_COLUMNS
                    WHERE UPPER(TABLE_NAME) = 'ORDERDETAILS'
                      AND UPPER(COLUMN_NAME) = 'ISREVIEWED';
                    IF col_exists = 0 THEN
                        EXECUTE IMMEDIATE 'ALTER TABLE ""OrderDetails"" ADD (""IsReviewed"" NUMBER(1) DEFAULT 0 NOT NULL)';
                    END IF;
                END;
            ");

            // Add OrderId to Reviews only if it doesn't exist (case-insensitive check)
            migrationBuilder.Sql(@"
                DECLARE
                    col_exists NUMBER := 0;
                BEGIN
                    SELECT COUNT(*) INTO col_exists
                    FROM USER_TAB_COLUMNS
                    WHERE UPPER(TABLE_NAME) = 'REVIEWS'
                      AND UPPER(COLUMN_NAME) = 'ORDERID';
                    IF col_exists = 0 THEN
                        EXECUTE IMMEDIATE 'ALTER TABLE ""Reviews"" ADD (""OrderId"" NUMBER(10) NULL)';
                    END IF;
                END;
            ");

            // Create IX_Reviews_OrderId index only if it doesn't exist
            migrationBuilder.Sql(@"
                DECLARE
                    idx_exists NUMBER := 0;
                BEGIN
                    SELECT COUNT(*) INTO idx_exists
                    FROM USER_INDEXES
                    WHERE UPPER(INDEX_NAME) = 'IX_REVIEWS_ORDERID';
                    IF idx_exists = 0 THEN
                        EXECUTE IMMEDIATE 'CREATE INDEX ""IX_Reviews_OrderId"" ON ""Reviews"" (""OrderId"")';
                    END IF;
                END;
            ");

            // Add FK only if it doesn't exist
            migrationBuilder.Sql(@"
                DECLARE
                    fk_exists NUMBER := 0;
                BEGIN
                    SELECT COUNT(*) INTO fk_exists
                    FROM USER_CONSTRAINTS
                    WHERE UPPER(CONSTRAINT_NAME) = 'FK_REVIEWS_ORDERS_ORDERID';
                    IF fk_exists = 0 THEN
                        EXECUTE IMMEDIATE 'ALTER TABLE ""Reviews"" ADD CONSTRAINT ""FK_Reviews_Orders_OrderId"" FOREIGN KEY (""OrderId"") REFERENCES ""Orders"" (""Id"") ON DELETE SET NULL';
                    END IF;
                END;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DECLARE
                    fk_exists NUMBER := 0;
                BEGIN
                    SELECT COUNT(*) INTO fk_exists
                    FROM USER_CONSTRAINTS
                    WHERE UPPER(CONSTRAINT_NAME) = 'FK_REVIEWS_ORDERS_ORDERID';
                    IF fk_exists = 1 THEN
                        EXECUTE IMMEDIATE 'ALTER TABLE ""Reviews"" DROP CONSTRAINT ""FK_Reviews_Orders_OrderId""';
                    END IF;
                END;
            ");

            migrationBuilder.Sql(@"
                DECLARE
                    idx_exists NUMBER := 0;
                BEGIN
                    SELECT COUNT(*) INTO idx_exists
                    FROM USER_INDEXES
                    WHERE UPPER(INDEX_NAME) = 'IX_REVIEWS_ORDERID';
                    IF idx_exists = 1 THEN
                        EXECUTE IMMEDIATE 'DROP INDEX ""IX_Reviews_OrderId""';
                    END IF;
                END;
            ");

            migrationBuilder.Sql(@"
                DECLARE
                    col_exists NUMBER := 0;
                BEGIN
                    SELECT COUNT(*) INTO col_exists
                    FROM USER_TAB_COLUMNS
                    WHERE UPPER(TABLE_NAME) = 'REVIEWS'
                      AND UPPER(COLUMN_NAME) = 'ORDERID';
                    IF col_exists = 1 THEN
                        EXECUTE IMMEDIATE 'ALTER TABLE ""Reviews"" DROP COLUMN ""OrderId""';
                    END IF;
                END;
            ");

            migrationBuilder.Sql(@"
                DECLARE
                    col_exists NUMBER := 0;
                BEGIN
                    SELECT COUNT(*) INTO col_exists
                    FROM USER_TAB_COLUMNS
                    WHERE UPPER(TABLE_NAME) = 'ORDERDETAILS'
                      AND UPPER(COLUMN_NAME) = 'ISREVIEWED';
                    IF col_exists = 1 THEN
                        EXECUTE IMMEDIATE 'ALTER TABLE ""OrderDetails"" DROP COLUMN ""IsReviewed""';
                    END IF;
                END;
            ");
        }
    }
}
