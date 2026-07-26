using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderCouponSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "DiscountPercentage",
                table: "Promotions",
                newName: "DiscountValue");

            migrationBuilder.AddColumn<string>(
                name: "DiscountType",
                table: "Promotions",
                type: "NVARCHAR2(2000)",
                nullable: false,
                defaultValue: "Percentage");

            migrationBuilder.AddColumn<decimal>(
                name: "MaxDiscountAmount",
                table: "Promotions",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MinOrderAmount",
                table: "Promotions",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "AppliedCouponCode",
                table: "Orders",
                type: "NVARCHAR2(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountAmount",
                table: "Orders",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SubTotal",
                table: "Orders",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Order_TotalAmount",
                table: "Orders",
                sql: "\"TotalAmount\" >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Order_TotalAmount",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DiscountType",
                table: "Promotions");

            migrationBuilder.DropColumn(
                name: "MaxDiscountAmount",
                table: "Promotions");

            migrationBuilder.DropColumn(
                name: "MinOrderAmount",
                table: "Promotions");

            migrationBuilder.DropColumn(
                name: "AppliedCouponCode",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DiscountAmount",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "SubTotal",
                table: "Orders");

            migrationBuilder.RenameColumn(
                name: "DiscountValue",
                table: "Promotions",
                newName: "DiscountPercentage");
        }
    }
}
