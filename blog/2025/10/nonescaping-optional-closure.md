# 비탈출 옵셔널 클로져

Swift 6.2에서 [비탈출 타입이 도입][SE-0446] 되기 전까지 Swift에서 탈출하지 않는 타입은 `@escaping` 어트리뷰트가 붙지 않은 클로져,
즉 비탈출 클로져밖에 없었다. 아니, 그런줄 알았다. 그러다 `UICollectionView`의
이 메서드를 만났다.

[SE-0446]: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0446-non-escapable.md

```Swift{3}
extension UICollectionView {
    func performBatchUpdates(
        _ updates: (() -> Void)?,
        completion: ((Bool) -> Void)? = nil
    )
}
```

Swift에서 비탈출 클로저는 [다른 타입의 프로퍼티로 저장될 수 없다][restrictions]. `updates`는 `(() -> Void)?` 타입,
조금 풀어서 적어보면 `Optional<(() -> Void)>` 타입이고, 따라서 클로저가 `Optional` enum 타입의 프로퍼티로 저장되어 있는 형태이다.
일반적인 Swift의 규칙을 적용한다면 이 클로져도 탈출하는 클로져여야 한다.

[restrictions]: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/types#Restrictions-for-Nonescaping-Closures

```Swift{7,11,12}
final class MyViewController: UIViewController {
    let collectionView = UICollectionView(frame: .zero, collectionViewLayout: UICollectionViewFlowLayout())
    var items: [Item]

    func addItems(_ newItems: [Item]) {
        collectionView.performBatchUpdates {
            let oldCount = items.count
            let newCount = oldCount + newItems.count
            let indexPathsForInsertedItems = (oldCount..<newCount).map { IndexPath(item: $0, section: 0) }

            items.append(contentsOf: newItems)
            collectionView.insertItems(at: indexPathsForInsertedItems)
        }
    }
}
```

하지만 실제로 사용해보면 `updates` 블럭 안에서 `self` 명시를 요구하지 않는 걸 확인할 수 있다. 즉 Swift는 이 클로저를 예외적으로
비탈출 타입으로 취급하고 있다. 어떻게 이런 게 가능할까?

미스테리는 `performBatchUpdates(_:completion:)` 함수를 선언한 헤더 파일에서 풀 수 있었다.

```Objective-C{2}
@interface UICollectionView : UIScrollView <UIDataSourceTranslating>
- (void)performBatchUpdates:(void (NS_NOESCAPE ^ _Nullable)(void))updates
                 completion:(void (^ _Nullable)(BOOL finished))completion NS_SWIFT_DISABLE_ASYNC;
@end
```

`NS_NOESCAPE` 이라는 단서가 보인다. 단서를 잘 따라가보면 또다른 C 매크로인 `CF_NOESCAPE`도 동일한
기능을 하고 있는 것을 볼 수 있고, 종국에는 [`__attribute__((noescape))`]라는 어트리뷰트로 변환되는 것을
확인할 수 있다. 이 어트리뷰트가 달린 클로져가 Swift에 임포트될 때 특별 취급이 있다는 건데, 이 특별 취급에 대한
설명은 탈출하지 않는 클로저의 개념을 Swift에 최초로 도입한 [SE-0012] 프로포절에서 찾을 수 있었다.
(이 시절엔 지금과 반대로 어트리뷰트를 달지 않으면 클로저가 탈출하게 디자인되어서 소소하게 헷갈리는 재미(?)가 있다.)

[`__attribute__((noescape))`]: https://clang.llvm.org/docs/AttributeReference.html#noescape
[SE-0012]: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0012-add-noescape-to-public-library-api.md#in-c-and-objective-c

말인즉슨 C/Objective-C 함수의 블럭 파라미터에 이 어트리뷰트가 붙어있다면 Swift 인터페이스에는 비탈출 클로저로 
번역된다는 것이다. Swift에서만 지원하는 비탈출 클로져를 옵셔널하게 받고 싶다면 Objective-C로 함수를 선언해야하는,
꽤 기묘한 풍경이다.

그런데 `performBatchUpdates(_:completion:)`는 왜 이 클로져를 옵셔널로 받을까? `updates` 없이 배치 업데이트를
호출할 이유도 잘 모르겠고, 문서를 보아도 `completion`이 `nil`이 될 수 있다는 언급은 있지만 `updates`가 `nil`이
될 수 있다는 언급은 없다. 어쩌면 고치긴 늦었고 고쳐서 얻을 것도 별로 없는, 그런 실수인 건 아닌가 싶다.

그것과 별개로 탈출하지 않는 옵셔널 클로저를 Swift에서 선언할 수 있는 방법이 생길 수도 있을까? 비탈출 타입도 도입되었고 하니 말이다.
안타깝게도 내 생각에는 자연스럽게 해결되지는 않을 것 같다. 가장 간단한 방법은 역시 옵셔널 클로저 파라미터도 기본적으로 비탈출 타입으로 간주하고,
탈출이 필요할 때에는 `@escaping` 어트리뷰트를 붙이도록 하는 것일텐데, 영향범위가 너무 크다.
반대로 기본적으로 탈출하는 것으로 보고, 비탈출인 경우에 `@nonescaping`을 붙이는 규칙으로 가자니 일관성도 떨어지고 어트리뷰트도 늘어난다.
관련해서 [포럼 스레드]도 있는데, 2019년을 마지막으로 업데이트가 없는 것으로 보아 비탈출 옵셔널 클로져가 필수적인 사용처도 없는 것 같다.

[포럼 스레드]: https://forums.swift.org/t/allowing-escaping-for-optional-closures-in-method-signature/27556

오늘은 알아둔다고 크게 도움이 되지는 않지만 소소하게 신기한 Swift의 잘 다듬어지지 않은 부분을 탐사해보았다.
Rust처럼 처음부터 소유권 개념을 가지고 시작했다면 클로저를 예외로 다루는 대신 타입 시스템의 일부로 다룰 수 있었을텐데,
Swift가 범용적인 언어를 지향하다보니 생기는 디자인 트레이드 오프이지 싶다. 그래도 이 정도면 잘 푼 것 같다!
