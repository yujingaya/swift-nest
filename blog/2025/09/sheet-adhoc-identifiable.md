# `Identifiable` 돌려막기

SwiftUI에서 모달 시트나 팝오버 같은 별도 뷰를 표시할 때는 view modifier를 사용한다. 이런 presentation modifier는 보통 
`isPresented`라는 이름으로 불 바인딩을 받는 계열과 `item`라는 이름으로 옵셔널 아이템 바인딩을 받는 계열의 두 계열로 제공된다.
모달 시트의 예를 보자.

* [`sheet(isPresented:onDismiss:content:)`](https://developer.apple.com/documentation/swiftui/view/sheet(ispresented:ondismiss:content:))
* [`sheet(item:onDismiss:content:)`](https://developer.apple.com/documentation/swiftui/view/sheet(item:ondismiss:content:))

`isPresented`는 쉽다. 하지만 표시할 뷰에 데이터를 넣어줘야할 때는 `item`을 써야 코드가 깔끔해진다.

`item` 방식에도 단점이 있는데, 바로 아이템이 `Identifiable`해야 한다는 점이다.
때때로 직접 선언하지 않은 타입을 아이템으로 써야할 때가 생기고, 그럴 때면 가독성을 포기하고 `isPresented`를 쓰거나,
아니면 오직 SwiftUI를 만족시키기 위한 아이템의 `Identifiable`한 래퍼 타입을 선언해주어야 한다.
[소급 프로토콜 채택](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0364-retroactive-conformance-warning.md)은 문화 시민이라면 지양하는 게 좋다.

오늘은 제네릭을 떡칠해서 이 `Identifiable` 요구사항을 확장성 있게 돌려막은 이야기이다.

## 실마리

`ForEach`를 가만히 보면 이 문제를 해결할 실마리를 찾을 수 있다. `ForEach`도 기본적으로는 자신이 보여줄
아이템이 `Identifiable`하기를 요구하는데, [키패스를 인자로 받는 생성자](https://developer.apple.com/documentation/swiftui/foreach/init(_:id:content:))를
사용하면 어떤 프로퍼티를 임시 식별자로 사용할지 키패스로 명시하는 것으로 이 요구사항을 갈음할 수 있다.

## 구현

`ForEach.init(_:id:content:)`같은 인터페이스를 제공하려면 먼저 `Identifiable`한 타입이
필요하다. 래퍼 선언하기 싫어서 시작한 것 아니었냐고 물어볼 수 있겠지만, 이 래퍼는 [모든 래퍼를 없애기 위한 래퍼](https://ko.wikipedia.org/wiki/전쟁을_끝내기_위한_전쟁)니까 괜찮다. 아마도.

`ForEach`를 흉내 내다보면 재료로 원본 아이템과 키패스, 두 개가 손에 들어온다. 이 둘을 조립해서
`Hashable`한 식별자를 돌려주면 `Identifiable` 뚝딱이다.

```swift
struct IdentifiableItem<Item, ID: Hashable>: Identifiable {
    let item: Item
    let keyPath: KeyPath<Item, ID>;

    var id: ID {
        item[keyPath: keyPath] // 짜잔. 여기다 ✨
    } 
}
```

이제 순정 `sheet(item:onDismiss:content:)`를 부를 궁리를 해보자. 일단 사용자에게 받은 아이템을 방금 만든
`IdentifiableItem`으로 바꿔치기 해야한다. 아니다. 자세히 보면 `Item`에서 `IdentifiableItem`이 아니라
`Binding<Item?>`에서 `Binding<IdentifiableItem?>`를 해야한다.
쫌 골치 아프다.

다행히 `Binding` 문서를 보니 자기가 가르키는 값 타입의 프로퍼티나 서브스크립트를
[다이나믹 멤버 룩업](https://developer.apple.com/documentation/swiftui/binding/subscript(dynamicmember:))으로
부를 수가 있다. Binding은 깠다. 옵셔널 아이템을 확장해서 `IdentifiableItem?`을
리턴하는 서브스크립트만 만들어두면 바인딩으로 감싼 녀석들도 똑같은 변환을 할 수 있다.

```swift
extension Optional {
    subscript<ID>(
        identifiedBy keyPath: KeyPath<Wrapped, ID>
    ) -> IdentifiableItem<Wrapped, ID>?
    where
        ID: Hashable
    {
        get {
            // Item? -> IdentifiableItem?
            map { IdentifiableItem(item: $0, keyPath: keyPath) }
        }
        set {
            // IdentifiableItem? -> Item?
            self = newValue?.item
        }
    }
}
```
   
이제 택갈이 준비가 끝났다. 우리의 view modifier는 `ForEach` 생성자처럼 아이템과 키패스를 세트로 받아야한다.
이 아이템과 키패스를 조립해서 우리가 열심히 만든 `IdentifiableItem`을 만들어주면 `sheet`을 속일 수 있다.

`onDismiss`는 받은 그대로 넘겨주면 된다.

우리가 한 번 감싸서 `IdentifiableItem`을 넘겨줬기 때문에 순정 `sheet`는 `content`를
`IdentifiableItem`으로 부른다. `IdentifiableItem`은 쓰는 입장에서는 굳이 알 필요도 없고, 
바깥에서 보기에는 아이템을 넘겨주었으니 아이템이 나오는 게 자연스러우니 한 번 까서 아이템으로 `content`를 불러주자.

정리하면 이렇다.

```swift
import SwiftUI

extension View {
    nonisolated func sheet<Item, ID>(
        item: Binding<Item?>,
        id: KeyPath<Item, ID>,
        onDismiss: (() -> Void)? = nil,
        @ViewBuilder content: @escaping (Item) -> some View
    ) -> some View
    where
        ID: Hashable
    {
        sheet(item: item[identifiedBy: id], onDismiss: onDismiss) {
                 // ^^^^^^^^^^^^^^^^^^^^^^
                 // 택갈이 중 ✨

            content($0.item) // 까기
        }
    }
}
```

이제 `String?`으로도 모달 시트를 띄울 수 있다! 🥳

```swift
struct ShowPartDetail: View {
    @State private var itemID: String?

    var body: some View {
        Button("Show Part Details") {
            itemID = "0123456789"
        }
        .sheet(item: $itemID, id: \.self) { itemID in
            ItemDetail(itemID: itemID)
        }
    }
}
```
## 결론

오늘은 SwiftUI의 직무유기를 잘 땜빵했다. 왜 순정에 이게 없는지는 잘 모르겠다.
`ForEach`에 비해 특별히 더 위험할 것도 없어 보이는데.

SwiftUI의 다른 모든 id들과 마찬가지로 이 글에서 소개한 id도 뷰의
수명을 결정한다. 즉 id가 바뀌면 상태를 모두 잃어버리고, 기존 뷰가 화면에서 빠지고
새 뷰가 들어오는 애니메이션이 적용될 수도 있다.

그러니 id로 써도 될만한 걸 id로 잘 골라서 쓰시고,
오늘도 타입 시스템의 가호가 함께하기를! 🖖
