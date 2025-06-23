import { getCurrentInstance, provide } from 'vue'
import { localProvidedStateMap } from './map'

export type ProvideLocalReturn = void

// /**
//  * On the basis of `provide`, it is allowed to directly call inject to obtain the value after call provide in the same component.
//  *
//  * @example
//  * ```ts
//  * provideLocal('MyInjectionKey', 1)
//  * const injectedValue = injectLocal('MyInjectionKey') // injectedValue === 1
//  * ```
//  */
// export function provideLocal<T, K = InjectionKey<T> | string | number>(key: K, value: K extends InjectionKey<infer V> ? V : T): ProvideLocalReturn {
//   const instance = getCurrentInstance()?.proxy
//   if (instance == null)
//     throw new Error('provideLocal must be called in setup')

//   if (!localProvidedStateMap.has(instance))
//     localProvidedStateMap.set(instance, Object.create(null))

//   const localProvidedState = localProvidedStateMap.get(instance)!
//   // @ts-expect-error allow InjectionKey as key
//   localProvidedState[key] = value
//   return provide<T, K>(key, value)
// }

export const provideLocal: typeof provide = (...args) => {
  const injectKey = args[0] as string | symbol
  const instance = getCurrentInstance()?.proxy
  if (!instance) {
    throw new Error('provide must use in setup!')
  }
  // 先判断 weakMap 中是否存在该实例
  if (!localProvidedStateMap.has(instance)) {
    // 没有的话，就创建一个空对象
    localProvidedStateMap.set(instance, Object.create(null))
  }
  const state = localProvidedStateMap.get(instance)!
  // 将注入的 key 和 value 都挂载到 instance 的 state 对象上面（因为可以有多个 state ）
  state[injectKey] = args[1]
  provide(...args)
}
