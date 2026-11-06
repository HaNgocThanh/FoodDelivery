using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class CheckoutIdempotencyAndPaymentExpiry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CheckoutFingerprint",
                table: "Orders",
                type: "NVARCHAR2(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CheckoutRequestId",
                table: "Orders",
                type: "NVARCHAR2(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PaymentExpiresAt",
                table: "Orders",
                type: "TIMESTAMP(7)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_PaymentExpiresAt",
                table: "Orders",
                column: "PaymentExpiresAt");

            migrationBuilder.CreateIndex(
                name: "UX_Orders_CheckoutRequest",
                table: "Orders",
                column: "CheckoutRequestId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Orders_PaymentExpiresAt",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "UX_Orders_CheckoutRequest",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CheckoutFingerprint",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CheckoutRequestId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "PaymentExpiresAt",
                table: "Orders");

        }
    }
}
