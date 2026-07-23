using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using FoodDelivery.Application.DTOs.Question;
using FoodDelivery.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuestionsController : ControllerBase
{
    private readonly ISupportService _supportService;

    public QuestionsController(ISupportService supportService)
    {
        _supportService = supportService;
    }

    /// <summary>
    /// Gửi câu hỏi về sản phẩm (Khách hàng đăng nhập)
    /// POST /api/questions
    /// </summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(QuestionResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateQuestion([FromBody] CreateQuestionDTO request, CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new ProblemDetails { Status = 401, Title = "Chưa xác thực", Detail = "Vui lòng đăng nhập để hỏi đáp sản phẩm." });
        }

        var result = await _supportService.CreateQuestionAsync(userId, request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Trả lời câu hỏi (Dành cho Admin)
    /// PUT /api/questions/{id}/answer
    /// </summary>
    [HttpPut("{id:int}/answer")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(QuestionResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AnswerQuestion(int id, [FromBody] AnswerQuestionDTO request, CancellationToken ct)
    {
        var result = await _supportService.AnswerQuestionAsync(id, request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách câu hỏi của một sản phẩm
    /// GET /api/questions/product/{productId}
    /// </summary>
    [HttpGet("product/{productId:int}")]
    [ProducesResponseType(typeof(IEnumerable<QuestionResponseDTO>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProductQuestions(int productId, CancellationToken ct)
    {
        var result = await _supportService.GetProductQuestionsAsync(productId, ct);
        return Ok(result);
    }

    /// <summary>
    /// Lấy các câu hỏi chưa được trả lời (Dành cho Admin)
    /// GET /api/questions/unanswered
    /// </summary>
    [HttpGet("unanswered")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(IEnumerable<QuestionResponseDTO>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetUnansweredQuestions(CancellationToken ct)
    {
        var result = await _supportService.GetUnansweredQuestionsAsync(ct);
        return Ok(result);
    }
}
