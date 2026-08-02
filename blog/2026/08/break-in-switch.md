# `switch`문 안의 `break`

```swift
for item in items {
    switch item {
    case .stop:
        break // switch문을 제어
    case .skip:
        continue // for문을 제어
    default:
        process(item)
    }
}
```

위 코드에서 `break`와 `continue`의 동작에는 차이가 없다. `break`는 `switch`문을 탈출하여 루프의 처음으로 돌아가고,
`continue`는 반복문에만 적용되기 때문에 `switch`를 무시하고 `for`문에 적용되어 루프의 처음으로 돌아가기 때문이다.

헷갈린다.