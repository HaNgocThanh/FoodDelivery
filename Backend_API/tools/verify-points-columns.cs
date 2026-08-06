using Microsoft.EntityFrameworkCore;
using FoodDelivery.Infrastructure.Data;

var conn = "Data Source=(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=localhost)(PORT=1522))(CONNECT_DATA=(SERVICE_NAME=FREE)));User Id=FOODDELIVERY;Password=123;";

var options = new DbContextOptionsBuilder<AppDbContext>()
    .UseOracle(conn)
    .Options;

using var ctx = new AppDbContext(options);

// Check Orders columns
var columns = await ctx.Database
    .SqlQueryRaw<ColumnInfo>("SELECT COLUMN_NAME, DATA_TYPE, NULLABLE FROM USER_TAB_COLUMNS WHERE TABLE_NAME = 'Orders' ORDER BY COLUMN_ID")
    .ToListAsync();

Console.WriteLine($"Total columns: {columns.Count}");
foreach (var c in columns)
{
    var marker = c.COLUMN_NAME is "POINTSUSED" or "POINTDISCOUNT" ? " <== NEW" : "";
    Console.WriteLine($"  {c.COLUMN_NAME,-30} {c.DATA_TYPE,-20} NULL={c.NULLABLE}{marker}");
}

public class ColumnInfo
{
    public string COLUMN_NAME { get; set; } = "";
    public string DATA_TYPE { get; set; } = "";
    public string NULLABLE { get; set; } = "";
}