import { NextRequest, NextResponse } from 'next/server'
import { postToSlack, WeeklyReportBlock } from '@/lib/slack'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { report, channel } = body as { report: WeeklyReportBlock; channel?: string }

    if (!report || !report.dateRange || !report.logs) {
      return NextResponse.json(
        { success: false, error: '缺少报告数据' },
        { status: 400 }
      )
    }

    const result = await postToSlack(report, channel)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: '周报已成功发送到 Slack',
        ts: result.ts,
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: '发送 Slack 消息失败' },
      { status: 500 }
    )
  }
}
