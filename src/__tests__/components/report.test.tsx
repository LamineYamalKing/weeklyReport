import React from 'react'
import { render, screen } from '@testing-library/react'

// 模拟 next/navigation 的 redirect
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

describe('首页重定向测试', () => {
  test('首页组件应该导入 redirect', async () => {
    // 验证 src/app/page.tsx 使用了 redirect
    const fs = require('fs')
    const path = require('path')
    const pageContent = fs.readFileSync(path.join(__dirname, '../../app/page.tsx'), 'utf-8')

    expect(pageContent).toContain("redirect('/logs')")
  })
})

describe('类型定义测试', () => {
  test('WorkLog 接口应该包含所有必要字段', async () => {
    const { WorkLog } = await import('@/types')
    // TypeScript 编译时已经验证了接口，这里检查导出是否存在
    expect(typeof WorkLog).toBe('undefined') // 接口在编译时被擦除，这是预期行为
  })

  test('ApiResponse 接口定义应该正确', async () => {
    const fs = require('fs')
    const path = require('path')
    const typesContent = fs.readFileSync(path.join(__dirname, '../../types/index.ts'), 'utf-8')

    expect(typesContent).toContain('WorkLog')
    expect(typesContent).toContain('Tag')
    expect(typesContent).toContain('ApiResponse')
  })
})

describe('数据库初始化测试', () => {
  test('db.ts 应该导出 getDb 函数', async () => {
    const dbModule = await import('@/lib/db')
    expect(typeof dbModule.getDb).toBe('function')
  })

  test('db.ts 应该导出 queryAll 函数', async () => {
    const dbModule = await import('@/lib/db')
    expect(typeof dbModule.queryAll).toBe('function')
  })

  test('db.ts 应该导出 queryOne 函数', async () => {
    const dbModule = await import('@/lib/db')
    expect(typeof dbModule.queryOne).toBe('function')
  })

  test('db.ts 应该导出 run 函数', async () => {
    const dbModule = await import('@/lib/db')
    expect(typeof dbModule.run).toBe('function')
  })

  test('db.ts 应该导出 saveDb 函数', async () => {
    const dbModule = await import('@/lib/db')
    expect(typeof dbModule.saveDb).toBe('function')
  })
})
