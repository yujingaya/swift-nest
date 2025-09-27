# 추천: The SwiftUI render loop

::: tip The SwiftUI render loop
https://rensbr.eu/blog/swiftui-render-loop
:::

이 글은 SwiftUI가 무효화된 뷰를 어느 시점에 평가하는지, 그리고 평가 중 다시 뷰가 무효화되는
경우를 어떻게 핸들링하는지 설명한다.

SwiftUI가 변경을 추적하는 대상에 수정이 가해지면 SwiftUI는 우선 뷰가 무효화되었다고만
표시해두고, 런 루프가 잠들기 직전에 무효화된 뷰들을 순회하며 `body` 프로퍼티를 평가하여
최신 상태를 얻어낸다. 만약 `body`에 `onChange(of:initial:_:)`와 같은 메서드가 있어서
평가 중 다시 뷰가 무효화된다면, SwiftUI는 무효화된 뷰의 `body`를 재평가한다.
이 과정에서 뷰가 다시 무효화되면 무한 루프에 빠질 위험이 있다고 판단하고 아래와 같은
에러 로그를 남기고 재평가를 멈춘다.

```
onChange(of: _) action tried to update multiple times per frame.
```

아래와 같은 뷰를 만들어보면 이 동작을 확인할 수 있다.

```swift{8,12}
struct ContentView: View {
    @State var counter = 0

    var body: some View {
        let _ = logger.debug("`body` is being evaluated.")

        Button("Update counter \(counter)") {
            counter = 42
        }
        .onChange(of: counter) {
            logger.debug("`onChange` from: \($0)\tto: \($1)")
            counter += 1
        }
    }
}
```

버튼을 누르게 되면 `counter` 프로퍼티가
업데이트되어 뷰가 무효화되고, 런 루프가 잠들기 직전에 `body`가 재평가된다. 이 과정에서 처음 알고
있던 `counter`의 값 `0`과 현재의 값 `42`가 다르기 때문에 `onChange`의 액션이 호출된다.
`onChange`는 다시 `counter` 값을 `43`으로 업데이트하며 뷰를 무효화하고, 잇따라 뷰가 재평가된다.
두 번째 액션이 수행되며 `counter` 값은 `44`로 업데이트되지만, 재평가 중 무효화가 일어났으므로
SwiftUI는 에러 로그를 남기고, 무효화를 무시하는 모드로 `body`를 평가한다.
마지막 평가의 결과에 따라 화면 상에는 `44`가 표시된다.

```log
`body` is being evaluated.
`onChange` from: 0	to: 42
`body` is being evaluated.
`onChange` from: 42	to: 43
`body` is being evaluated.
onChange(of: Int) action tried to update multiple times per frame.
```

어떤 프레임워크든 렌더 루프 개념은 추상화되어 잘 드러나지 않지만, SwiftUI의 경우에는
선언적인 스타일 때문에 특히 잘 숨겨져있다. 이런 추상화 덕분에 간결하고 이해하기 쉬운 코드가
나오기는 하지만, 때로 내부 구현을 알아야 쉽게 해결할 수 있는 문제를 마주하게 된다.
그럴 때 오늘의 추천 글이 도움이 될 수 있을 것 같다.