import { Router } from 'express'
import { queryAll, runSql, insertAndGetId } from '../db-helper.js'

const router = Router()

// 获取所有房型
router.get('/', (req, res) => {
  const rows = queryAll('SELECT * FROM room_types ORDER BY sort_order, id')
  res.json(rows)
})

// 新增房型
router.post('/', (req, res) => {
  const { name } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: '房型名称不能为空' })

  const existing = queryAll('SELECT id FROM room_types WHERE name = ?', [name.trim()])
  if (existing.length > 0) return res.status(400).json({ error: '该房型已存在' })

  const maxSort = queryAll('SELECT COALESCE(MAX(sort_order), -1) as m FROM room_types')
  const sortOrder = (maxSort[0]?.m ?? -1) + 1

  const id = insertAndGetId(
    'INSERT INTO room_types (name, sort_order) VALUES (?, ?)',
    [name.trim(), sortOrder]
  )
  res.json({ id, success: true })
})

// 删除房型
router.delete('/:id', (req, res) => {
  const rt = queryAll('SELECT * FROM room_types WHERE id = ?', [req.params.id])
  if (rt.length === 0) return res.status(404).json({ error: '房型不存在' })

  // 检查是否有房间正在使用该房型
  const used = queryAll('SELECT COUNT(*) as cnt FROM rooms WHERE room_type = ?', [rt[0].name])
  if (used[0]?.cnt > 0) return res.status(400).json({ error: `该房型下有 ${used[0].cnt} 个房间，无法删除` })

  runSql('DELETE FROM room_types WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

export default router
