import { getCurrentInstance, inject } from 'vue'
import { localProvidedStateMap } from '../provideLocal/map'

// /**
//  * On the basis of `inject`, it is allowed to directly call inject to obtain the value after call provide in the same component.
//  *
//  * @example
//  * ```ts
//  * injectLocal('MyInjectionKey', 1)
//  * const injectedValue = injectLocal('MyInjectionKey') // injectedValue === 1
//  * ```
//  */
// // @ts-expect-error overloads are not compatible
// export const injectLocal: typeof inject = (...args) => {
//   const key = args[0] as string | symbol
//   const instance = getCurrentInstance()?.proxy
//   if (instance == null && !hasInjectionContext())
//     throw new Error('injectLocal must be called in setup')

//   if (instance && localProvidedStateMap.has(instance) && key in localProvidedStateMap.get(instance)!)
//     return localProvidedStateMap.get(instance)![key]

//   // @ts-expect-error overloads are not compatible
//   return inject(...args)
// }

/**
 * vue 原生的 inject 是无法在当前组件中 provide 后立刻去 inject 使用的
 * 改造完的函数，会将当前实例存到 weakMap 中，然后在该实例上 挂载 传入的 injectKey 的值
 */
// @ts-expect-error overloads are not compatible
export const injectLocal: typeof inject = (...args) => {
  const injectKey = args[0]
  const instance = getCurrentInstance()?.proxy
  if (!instance) {
    throw new Error('injectLocal must use in setup !')
  }
  // 如果 weakmap 中存在这个实例的 state 对象，并且提供的 injectKey 也在 state 上面，则直接返回 state 上绑定的值（看一下 injectLocal 就明白了）
  if (localProvidedStateMap.has(instance) && injectKey in localProvidedStateMap.get(instance)!) {
    return localProvidedStateMap.get(instance)![injectKey]
  }
  // @ts-expect-error overloads are not compatible
  return inject(...args)
}
