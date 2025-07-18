import { describe, expect, it } from 'vitest'
import { ref as deepRef, nextTick, shallowRef } from 'vue'
import { useRefHistory } from './index'

describe('useRefHistory - sync', () => {
  it('sync: should record', () => {
    const v = shallowRef(0)
    const { history } = useRefHistory(v, { flush: 'sync' })

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe(0)

    v.value = 2

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe(2)
    expect(history.value[1].snapshot).toBe(0)
  })

  it('sync: should be able to undo and redo', () => {
    const v = shallowRef(0)
    const { undo, redo, clear, canUndo, canRedo, history, last } = useRefHistory(v, { flush: 'sync' })

    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(false)

    v.value = 2
    v.value = 3
    v.value = 4

    expect(canUndo.value).toBe(true)
    expect(canRedo.value).toBe(false)

    expect(v.value).toBe(4)
    expect(history.value.length).toBe(4)
    expect(last.value.snapshot).toBe(4)
    undo()

    expect(canUndo.value).toBe(true)
    expect(canRedo.value).toBe(true)

    expect(v.value).toBe(3)
    expect(last.value.snapshot).toBe(3)
    undo()
    expect(v.value).toBe(2)
    expect(last.value.snapshot).toBe(2)
    redo()
    expect(v.value).toBe(3)
    expect(last.value.snapshot).toBe(3)
    redo()
    expect(v.value).toBe(4)
    expect(last.value.snapshot).toBe(4)

    expect(canUndo.value).toBe(true)
    expect(canRedo.value).toBe(false)

    redo()
    expect(v.value).toBe(4)
    expect(last.value.snapshot).toBe(4)

    clear()
    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(false)
  })

  it('sync: object with deep', () => {
    const v = deepRef({ foo: 'bar' })
    const { history, undo } = useRefHistory(v, { flush: 'sync', deep: true })

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot.foo).toBe('bar')

    v.value.foo = 'foo'

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot.foo).toBe('foo')

    // different references
    expect(history.value[1].snapshot.foo).toBe('bar')
    expect(history.value[0].snapshot).not.toBe(history.value[1].snapshot)

    undo()

    // history references should not be equal to the source
    expect(history.value[0].snapshot).not.toBe(v.value)
  })

  it('sync: shallow watch with clone', () => {
    const v = deepRef({ foo: 'bar' })
    const { history, undo } = useRefHistory(v, { flush: 'sync', clone: true })

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot.foo).toBe('bar')

    v.value.foo = 'foo'

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot.foo).toBe('bar')

    v.value = { foo: 'foo' }

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot.foo).toBe('foo')

    // different references
    expect(history.value[1].snapshot.foo).toBe('bar')
    expect(history.value[0].snapshot).not.toBe(history.value[1].snapshot)

    undo()

    // history references should not be equal to the source
    expect(history.value[0].snapshot).not.toBe(v.value)
  })

  it('sync: dump + parse', () => {
    const v = deepRef({ a: 'bar' })
    const { history, undo } = useRefHistory(v, {
      flush: 'sync',
      deep: true,
      dump: v => JSON.stringify(v),
      parse: (v: string) => JSON.parse(v),
    })

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe('{"a":"bar"}')

    v.value.a = 'foo'

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe('{"a":"foo"}')
    expect(history.value[1].snapshot).toBe('{"a":"bar"}')

    undo()

    expect(v.value.a).toBe('bar')
  })

  it('sync: commit', () => {
    const v = shallowRef(0)
    const { commit, history } = useRefHistory(v, { flush: 'sync' })

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe(0)

    commit()

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe(0)
    expect(history.value[1].snapshot).toBe(0)
  })

  it('sync: without batch', () => {
    const v = deepRef({ foo: 1, bar: 'one' })
    const { history } = useRefHistory(v, { flush: 'sync', deep: true })

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toEqual({ foo: 1, bar: 'one' })

    v.value.foo = 2
    v.value.bar = 'two'

    expect(history.value.length).toBe(3)
    expect(history.value[0].snapshot).toEqual({ foo: 2, bar: 'two' })
    expect(history.value[1].snapshot).toEqual({ foo: 2, bar: 'one' })
    expect(history.value[2].snapshot).toEqual({ foo: 1, bar: 'one' })
  })

  it('sync: with batch', () => {
    const v = deepRef({ foo: 1, bar: 'one' })
    const { history, batch } = useRefHistory(v, { flush: 'sync', deep: true })

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toEqual({ foo: 1, bar: 'one' })

    batch(() => {
      v.value.foo = 2
      v.value.bar = 'two'
    })

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toEqual({ foo: 2, bar: 'two' })
    expect(history.value[1].snapshot).toEqual({ foo: 1, bar: 'one' })

    batch((cancel) => {
      v.value.foo = 3
      v.value.bar = 'three'
      cancel()
    })

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toEqual({ foo: 2, bar: 'two' })
    expect(history.value[1].snapshot).toEqual({ foo: 1, bar: 'one' })
  })

  it('sync: pause and resume', () => {
    const v = shallowRef(1)
    const { history, pause, resume, last } = useRefHistory(v, { flush: 'sync' })

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe(1)

    pause()
    v.value = 2

    expect(history.value.length).toBe(1)
    expect(last.value.snapshot).toBe(1)

    resume()

    expect(history.value.length).toBe(1)
    expect(last.value.snapshot).toBe(1)

    v.value = 3

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe(3)
    expect(last.value.snapshot).toBe(3)

    pause()
    v.value = 4

    expect(history.value.length).toBe(2)
    expect(last.value.snapshot).toBe(3)

    resume(true)

    expect(history.value.length).toBe(3)
    expect(last.value.snapshot).toBe(4)
  })

  it('sync: reset', () => {
    const v = shallowRef(0)
    const { history, commit, undoStack, redoStack, pause, reset, undo } = useRefHistory(v, { flush: 'sync' })

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe(0)

    v.value = 1

    pause()

    v.value = 2

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe(1)
    expect(history.value[1].snapshot).toBe(0)

    reset()

    // v value needs to be the last history point, but history is unchanged
    expect(v.value).toBe(1)

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe(1)
    expect(history.value[1].snapshot).toBe(0)

    reset()

    // Calling reset twice is a no-op
    expect(v.value).toBe(1)

    expect(history.value.length).toBe(2)
    expect(history.value[1].snapshot).toBe(0)
    expect(history.value[0].snapshot).toBe(1)

    // Same test, but with a non empty redoStack

    v.value = 3
    commit()

    undo()

    v.value = 2

    reset()

    expect(v.value).toBe(1)

    expect(undoStack.value.length).toBe(1)
    expect(undoStack.value[0].snapshot).toBe(0)

    expect(redoStack.value.length).toBe(1)
    expect(redoStack.value[0].snapshot).toBe(3)
  })

  it('sync: dispose', () => {
    const v = shallowRef(0)
    const { history, dispose, last } = useRefHistory(v, { flush: 'sync' })

    v.value = 1
    v.value = 2

    dispose()

    v.value = 3

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe(2)
    expect(last.value.snapshot).toBe(2)
  })

  it('sync: should respect shouldCommit option', () => {
    const v = deepRef(0)
    const { history } = useRefHistory(v, {
      flush: 'sync',
      shouldCommit: (oldValue: number | undefined, newValue: number) => newValue > 0,
    })

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe(0)

    v.value = -1
    expect(history.value.length).toBe(1)

    v.value = 2
    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe(2)

    v.value = -3
    expect(history.value.length).toBe(2)

    v.value = 4
    expect(history.value.length).toBe(3)
    expect(history.value[0].snapshot).toBe(4)
  })
})

describe('useRefHistory - pre', () => {
  it('pre: should record', async () => {
    const v = shallowRef(0)
    const { history } = useRefHistory(v)

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe(0)

    v.value = 2
    await nextTick()

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe(2)
    expect(history.value[1].snapshot).toBe(0)
  })

  it('pre: should be able to undo and redo', async () => {
    const v = shallowRef(0)
    const { undo, redo, clear, canUndo, canRedo, history, last } = useRefHistory(v)

    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(false)

    v.value = 2
    await nextTick()
    v.value = 3
    await nextTick()
    v.value = 4
    await nextTick()

    expect(v.value).toBe(4)
    expect(history.value.length).toBe(4)
    expect(last.value.snapshot).toBe(4)
    expect(canUndo.value).toBe(true)
    expect(canRedo.value).toBe(false)
    undo()
    await nextTick()
    expect(v.value).toBe(3)
    expect(last.value.snapshot).toBe(3)
    undo()
    await nextTick()
    expect(v.value).toBe(2)
    expect(last.value.snapshot).toBe(2)
    redo()
    await nextTick()
    expect(canUndo.value).toBe(true)
    expect(canRedo.value).toBe(true)
    expect(v.value).toBe(3)
    expect(last.value.snapshot).toBe(3)
    redo()
    await nextTick()
    expect(v.value).toBe(4)
    expect(last.value.snapshot).toBe(4)
    redo()
    await nextTick()
    expect(v.value).toBe(4)
    expect(last.value.snapshot).toBe(4)
    expect(canUndo.value).toBe(true)
    expect(canRedo.value).toBe(false)

    clear()

    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(false)
  })

  it('pre: object with deep', async () => {
    const v = deepRef({ foo: 'bar' })
    const { history } = useRefHistory(v, { deep: true })

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot.foo).toBe('bar')

    v.value.foo = 'foo'
    await nextTick()

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot.foo).toBe('foo')

    // different references
    expect(history.value[1].snapshot.foo).toBe('bar')
    expect(history.value[0].snapshot).not.toBe(history.value[1].snapshot)
  })

  it('pre: dump + parse', async () => {
    const v = deepRef({ a: 'bar' })
    const { history, undo } = useRefHistory(v, {
      deep: true,
      dump: v => JSON.stringify(v),
      parse: (v: string) => JSON.parse(v),
    })

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe('{"a":"bar"}')

    v.value.a = 'foo'
    await nextTick()

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe('{"a":"foo"}')
    expect(history.value[1].snapshot).toBe('{"a":"bar"}')

    undo()
    await nextTick()

    expect(v.value.a).toBe('bar')
  })

  it('pre: commit', async () => {
    const v = shallowRef(0)
    const { commit, history, undo } = useRefHistory(v)

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe(0)

    commit()

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe(0)
    expect(history.value[1].snapshot).toBe(0)

    undo()
    v.value = 2
    commit()
    await nextTick()

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe(2)
    expect(history.value[1].snapshot).toBe(0)
  })

  it('pre: pause and resume', async () => {
    const v = shallowRef(1)
    const { history, pause, resume, last } = useRefHistory(v)

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe(1)

    pause()
    v.value = 2
    await nextTick()

    expect(history.value.length).toBe(1)
    expect(last.value.snapshot).toBe(1)

    resume()
    await nextTick()

    expect(history.value.length).toBe(1)
    expect(last.value.snapshot).toBe(1)

    v.value = 3
    await nextTick()

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe(3)
    expect(last.value.snapshot).toBe(3)

    pause()
    v.value = 4
    await nextTick()

    expect(history.value.length).toBe(2)
    expect(last.value.snapshot).toBe(3)

    resume(true)
    await nextTick()

    expect(history.value.length).toBe(3)
    expect(last.value.snapshot).toBe(4)
  })

  it('pre: reset', async () => {
    const v = shallowRef(0)
    const { history, commit, undoStack, redoStack, pause, reset, undo } = useRefHistory(v)

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe(0)

    v.value = 1
    await nextTick()

    pause()

    v.value = 2
    await nextTick()

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe(1)
    expect(history.value[1].snapshot).toBe(0)

    reset()

    // v value needs to be the last history point, but history is unchanged
    expect(v.value).toBe(1)

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe(1)
    expect(history.value[1].snapshot).toBe(0)

    reset()

    // Calling reset twice is a no-op
    expect(v.value).toBe(1)

    expect(history.value.length).toBe(2)
    expect(history.value[1].snapshot).toBe(0)
    expect(history.value[0].snapshot).toBe(1)

    // Same test, but with a non empty redoStack

    v.value = 3
    commit()

    undo()
    await nextTick()

    v.value = 2
    await nextTick()

    reset()
    await nextTick()

    expect(v.value).toBe(1)

    expect(undoStack.value.length).toBe(1)
    expect(undoStack.value[0].snapshot).toBe(0)

    expect(redoStack.value.length).toBe(1)
    expect(redoStack.value[0].snapshot).toBe(3)
  })

  it('pre: auto batching', async () => {
    const v = shallowRef(0)
    const { history } = useRefHistory(v)

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe(0)

    v.value = 1

    expect(history.value.length).toBe(1)
    await nextTick()
    expect(history.value.length).toBe(2)

    v.value += 1
    v.value += 1

    expect(history.value.length).toBe(2)
    await nextTick()
    expect(history.value.length).toBe(3)
    expect(history.value[0].snapshot).toBe(3)
    expect(history.value[1].snapshot).toBe(1)

    await nextTick()
    expect(history.value.length).toBe(3)
  })

  it('pre: dispose', async () => {
    const v = shallowRef(0)
    const { history, dispose, last } = useRefHistory(v)

    v.value = 1
    await nextTick()
    v.value = 2
    await nextTick()

    dispose()

    v.value = 3
    await nextTick()

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe(2)
    expect(last.value.snapshot).toBe(2)
  })

  it('pre: should respect shouldCommit option', async () => {
    const v = deepRef(0)
    const { history } = useRefHistory(v, {
      shouldCommit: (oldValue: number | undefined, newValue: number) => newValue > 0,
    })

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe(0)

    v.value = -1
    await nextTick()
    expect(history.value.length).toBe(1)

    v.value = 2
    await nextTick()
    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe(2)

    v.value = -3
    await nextTick()
    expect(history.value.length).toBe(2)

    v.value = 4
    await nextTick()
    expect(history.value.length).toBe(3)
    expect(history.value[0].snapshot).toBe(4)
  })
})
