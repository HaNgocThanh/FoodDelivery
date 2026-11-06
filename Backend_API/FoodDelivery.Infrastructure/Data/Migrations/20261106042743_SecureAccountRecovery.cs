using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class SecureAccountRecovery : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ResetPasswordAttempts",
                table: "AppUsers",
                type: "NUMBER(10)",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SessionVersion",
                table: "AppUsers",
                type: "NVARCHAR2(32)",
                maxLength: 32,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ResetPasswordAttempts",
                table: "AppUsers");

            migrationBuilder.DropColumn(
                name: "SessionVersion",
                table: "AppUsers");
        }
    }
}
