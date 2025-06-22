import type { AnyFn } from '../utils'
import { effectScope, shallowRef } from 'vue'

export type CreateGlobalStateReturn<Fn extends AnyFn = AnyFn> = Fn

// /**
//  * Keep states in the global scope to be reusable across Vue instances.
//  *
//  * @see https://vueuse.org/createGlobalState
//  * @param stateFactory A factory function to create the state
//  */
// export function createGlobalState<Fn extends AnyFn>(
//   stateFactory: Fn,
// ): CreateGlobalStateReturn<Fn> {
//   let initialized = false
//   let state: any
//   const scope = effectScope(true)

//   return ((...args: any[]) => {
//     if (!initialized) {
//       state = scope.run(() => stateFactory(...args))!
//       initialized = true
//     }
//     return state
//   }) as Fn
// }

export function createGlobalState<T extends AnyFn>(fn: T): T {
  let isInitialize = false
  let state: any = null
  /**
   * effectScope 默认是 false 即子作用域会嵌套在父作用域中，如果父亲 stop 了，那子作用域里面的所有副作用也会 stop
   * 写成 true 的话，目的是让这个状态完全独立，不受组件 mount/unmount 的生命周期影响
   */
  const scope = effectScope(true)
  return ((...arg: any[]) => {
    if (!isInitialize) {
      // scope.run 的返回值的结果就是传入回调函数的执行结果
      state = scope.run(() => fn(...arg))
      isInitialize = true
    }
    return state
  }) as T
}

const useGlobalUser = createGlobalState(() => {
  return shallowRef({
    name: 'aimerthyr',
    loggedIn: false,
  })
})

// 多个组件中 调用这个，会共用一个，类似于单例模式
const user = useGlobalUser()
console.warn(user.value.name) // => 'aimerthyr'
