import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SlackClient } from '@slack/web-api'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const DEFAULT_CHANNEL = process.env.SLACK_DEFAULT_CHANNEL || 'team-updates'

// 验证 token
if (!SLACK_BOT_TOKEN) {
  console.error('缺少 SLACK_BOT_TOKEN 环境变量')
  process.exit(1)
}

const slack = new SlackClient(SLACK_BOT_TOKEN)

// 创建 MCP 服务器
const server = new Server(
  {
    name: 'slack-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// 格式化周报为 Slack 消息
function formatReportBlocks(report: {
  dateRange: { start: string; end: string }
  logs: Array<{
    title: string
    description?: string
    actual_hours: number
    estimated_hours?: number
    date: string
    tags?: Array<{ name: string; color: string }>
  }>
  totalHours: number
  totalEstimatedHours: number
}) {
  const { dateRange, logs, totalHours, totalEstimatedHours } = report

  const blocks: object[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📊 工作周报 (${dateRange.start} ~ ${dateRange.end})`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*实际时长:*\n${totalHours.toFixed(1)} 小时`,
        },
        {
          type: 'mrkdwn',
          text: `*预计时长:*\n${totalEstimatedHours.toFixed(1)} 小时`,
        },
        {
          type: 'mrkdwn',
          text: `*记录数:*\n${logs.length} 条`,
        },
      ],
    },
    { type: 'divider' },
  ]

  // 按日期分组
  const groups: Record<string, typeof logs> = {}
  for (const log of logs) {
    if (!groups[log.date]) groups[log.date] = []
    groups[log.date].push(log)
  }

  for (const [date, dayLogs] of Object.entries(groups)) {
    const dayHours = dayLogs.reduce((sum, l) => sum + (l.actual_hours || 0), 0)

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📅 ${date}* (${dayHours.toFixed(1)}h)`,
      },
    })

    for (const log of dayLogs) {
      const tagText = log.tags && log.tags.length > 0 ? log.tags.map((t) => `\`${t.name}\``).join(' ') : ''

      let logText = `• *${log.title}*`
      if (tagText) logText += ` ${tagText}`
      logText += ` | ${log.actual_hours}h`

      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: logText },
      })

      if (log.description) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `>${log.description.slice(0, 200)}${log.description.length > 200 ? '...' : ''}`,
          },
        })
      }
    }

    blocks.push({ type: 'divider' })
  }

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*本周总计:* ${totalHours.toFixed(1)} 小时  |  *预计总计:* ${totalEstimatedHours.toFixed(1)} 小时`,
    },
  })

  return blocks
}

// 注册发送周报工具
server.setRequestHandler(
  { method: 'tools/list' },
  async () => ({
    tools: [
      {
        name: 'post_weekly_report_to_slack',
        description: '发送工作周报到 Slack 频道。输入周报数据和目标频道，发送富文本格式的周报消息。',
        inputSchema: {
          type: 'object',
          properties: {
            report: {
              type: 'object',
              description: '周报数据对象',
              properties: {
                dateRange: {
                  type: 'object',
                  properties: {
                    start: { type: 'string', description: '开始日期 YYYY-MM-DD' },
                    end: { type: 'string', description: '结束日期 YYYY-MM-DD' },
                  },
                },
                logs: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string' },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      actual_hours: { type: 'number' },
                      estimated_hours: { type: 'number' },
                      tags: {
                        type: 'array',
                        items: { type: 'object', properties: { name: { type: 'string' }, color: { type: 'string' } } },
                      },
                    },
                  },
                },
                totalHours: { type: 'number' },
                totalEstimatedHours: { type: 'number' },
              },
              required: ['dateRange', 'logs', 'totalHours', 'totalEstimatedHours'],
            },
            channel: {
              type: 'string',
              description: 'Slack 频道 ID 或名称（不填则使用默认频道 team-updates）',
              default: DEFAULT_CHANNEL,
            },
          },
          required: ['report'],
        },
      },
    ],
  })
)

// 处理工具调用
server.setRequestHandler(
  { method: 'tools/call' },
  async (request) => {
    const { name, arguments: args } = request.params

    if (name === 'post_weekly_report_to_slack') {
      const { report, channel = DEFAULT_CHANNEL } = args as {
        report: {
          dateRange: { start: string; end: string }
          logs: Array<{
            title: string
            description?: string
            actual_hours: number
            estimated_hours?: number
            date: string
            tags?: Array<{ name: string; color: string }>
          }>
          totalHours: number
          totalEstimatedHours: number
        }
        channel?: string
      }

      try {
        const blocks = formatReportBlocks(report)

        const result = await slack.chat.postMessage({
          channel,
          blocks,
          text: `工作周报 (${report.dateRange.start} ~ ${report.dateRange.end})`,
        })

        return {
          content: [
            {
              type: 'text',
              text: `✅ 周报已成功发送到 Slack 频道 #${channel}\n消息时间戳: ${result.ts}`,
            },
          ],
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '发送失败'
        return {
          content: [
            {
              type: 'text',
              text: `❌ 发送失败: ${message}`,
            },
          ],
          isError: true,
        }
      }
    }

    return {
      content: [{ type: 'text', text: '未知工具' }],
      isError: true,
    }
  }
)

// 启动服务器
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Slack MCP 服务器已启动')
}

main().catch(console.error)
