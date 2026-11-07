import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pb, currentUserId } from '../client'
import {
  listCantieri,
  getCantiere,
  createCantiere,
  updateCantiere,
  deleteCantiere,
} from '../cantieri'
import type { Cantiere } from '../../types'

vi.mock('../client', () => ({
  pb: { collection: vi.fn() },
  currentUserId: vi.fn(),
}))

const collection = {
  getFullList: vi.fn(),
  getOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

const rawCantiere: Cantiere = {
  id: 'abc123',
  user: 'user-1',
  nome: 'Cantiere Nord',
  indirizzo: 'Via Roma 1',
  comune: 'Milano',
  committente: '',
  impresa_affidataria: '',
  cse: '',
  dl: '',
  responsabile_lavori: '',
  importo: '',
  data_inizio: '',
  data_fine: '',
  notifica_preliminare: false,
  created: '2026-11-07 10:00:00.000Z',
  updated: '2026-11-07 10:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(pb.collection).mockReturnValue(
    collection as unknown as ReturnType<typeof pb.collection>,
  )
  vi.mocked(currentUserId).mockReturnValue('user-1')
})

describe('cantieri API', () => {
  it('lists cantieri through the typed mapping, querying the right collection', async () => {
    collection.getFullList.mockResolvedValue([rawCantiere])

    const result = await listCantieri()

    expect(pb.collection).toHaveBeenCalledWith('cantieri')
    expect(collection.getFullList).toHaveBeenCalledOnce()
    expect(result).toEqual([rawCantiere])
  })

  it('fetches a single cantiere by id', async () => {
    collection.getOne.mockResolvedValue(rawCantiere)

    const result = await getCantiere('abc123')

    expect(pb.collection).toHaveBeenCalledWith('cantieri')
    expect(collection.getOne).toHaveBeenCalledWith('abc123')
    expect(result).toEqual(rawCantiere)
  })

  it('sets the owner user from the auth store on create', async () => {
    collection.create.mockResolvedValue(rawCantiere)

    const input = { nome: 'Cantiere Sud', comune: 'Roma' }
    const result = await createCantiere(input)

    expect(pb.collection).toHaveBeenCalledWith('cantieri')
    expect(collection.create).toHaveBeenCalledWith({ ...input, user: 'user-1' })
    expect(result).toEqual(rawCantiere)
  })

  it('updates a cantiere', async () => {
    collection.update.mockResolvedValue(rawCantiere)

    await updateCantiere('abc123', { nome: 'Nuovo nome' })

    expect(pb.collection).toHaveBeenCalledWith('cantieri')
    expect(collection.update).toHaveBeenCalledWith('abc123', { nome: 'Nuovo nome' })
  })

  it('deletes a cantiere', async () => {
    collection.delete.mockResolvedValue(true)

    const result = await deleteCantiere('abc123')

    expect(pb.collection).toHaveBeenCalledWith('cantieri')
    expect(collection.delete).toHaveBeenCalledWith('abc123')
    expect(result).toBe(true)
  })
})
