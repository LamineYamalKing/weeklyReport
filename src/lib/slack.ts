import { WebClient } from '@slack/web-api'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const DEFAULT_CHANNEL = process.env.SLACK_DEFAULT_CHANNEL || 'team-updates'

let slackClient: WebClient | null = null

export function getSlackClient(): WebClient | null {
  if (!SLACK_BOT_TOKEN) {
    console.warn('SLACK_BOT_TOKEN 环境变量未设置，Slack 功能不可用')
    return null
  }
  if (!slackClient) {
    slackClient = new WebClient(SLACK_BOT_TOKEN)
  }
  return slackClient
}

export interface WeeklyReportBlock {
  dateRange: { start: string; end: string }
  logs: Array<{
    id: number
    date: string
    title: string
    description?: string
    estimated_hours: number
    actual_hours: number
    tags: Array<{ id: number; name: string; color: string }>
  }>
  totalHours: number
  totalEstimatedHours: number
}

export function formatReportToSlackBlocks(report: WeeklyReportBlock) {
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
      const tagText =
        log.tags && log.tags.length > 0
          ? log.tags.map((t) => `\`${t.name}\``).join(' ')
          : ''

      let logText = `• *${log.title}*`
      if (tagText) logText += ` ${tagText}`
      logText += ` | ${log.actual_hours}h`
      if (log.estimated_hours) logText += ` (预计 ${log.estimated_hours}h)`

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: logText,
        },
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

  // 添加总计
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*本周总计:* ${totalHours.toFixed(1)} 小时  |  *预计总计:* ${totalEstimatedHours.toFixed(1)} 小时`,
    },
  })

  return blocks
}

export async function postToSlack(
  report: WeeklyReportBlock,
  channel: string = DEFAULT_CHANNEL
): Promise<{ success: boolean; error?: string; ts?: string }> {
  const client = getSlackClient()
  if (!client) {
    return { success: false, error: 'Slack 客户端未初始化，请检查 SLACK_BOT_TOKEN 环境变量' }
  }

  try {
    const blocks = formatReportToSlackBlocks(report)
    const result = await client.chat.postMessage({
      channel,
      blocks,
      text: `工作周报 (${report.dateRange.start} ~ ${report.dateRange.end})`,
    })

    return { success: true, ts: result.ts as string }
  } catch (error) {
    const message = error instanceof Error ? error.message : '发送失败'
    return { success: false, error: message }
  }
}
