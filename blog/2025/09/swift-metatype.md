# Swift의 메타타입

프로그래밍 언어에서 타입은 값의 집합이다. `Void`는 `()` 값 단 하나만 포함하는 타입이고,
`Never` 타입은 어떤 값도 포함하지 않는 공집합 타입이다. `Int`는 `7`, `42` 같은 숫자 값을 원소로 가진다.

Swift에서는 타입 자체도 값으로 주고받을 수 있다. 이렇게 타입이 값으로 사용될 때 타입 인스턴스를
**메타타입**이라 부르고, 메타타입의 집합은 **메타타입 타입**이라고 부른다. 메타타입과 메타타입 타입을
적기 위해서는 고유의 문법을 사용해야 하는데, 예를 들어 `Int` 타입의 메타타입을 적으려면 `Int.self`라고 적고,
메타타입 타입을 적기 위해서는 `Int.Type`이라고 적으면 된다.

```swift
let myType: Int.Type = Int.self
```

예상할 수 있듯이 `Int.self`은 `Int.Type` 타입의 유일한 원소다. 원소가 하나밖에 없으니 싱글턴 메타타입이라고 부를 수 있겠다.

## 클래스의 메타타입

원소가 하나밖에 없어서 재미도 없으니 원소가 여러 개인 타입을 찾아보자. 일단 서브클래스의 메타타입은 슈퍼클래스의 메타타입 타입의 원소이다.

```swift
class SuperClass {
    var name: String

    required init(name: String) {
        self.name = name
    }
}

class SubClass: SuperClass {
    var nickName: String?

    required init(name: String) {
        self.nickName = nil

        super.init(name: name)
    }
}

let myClassType: SuperClass.Type = SubClass.self
```

이렇게 한 메타타입 타입에 여러 원소가 있으면 일종의 다형성을 얻어내는데 활용할 수 있다. 예를 들어 위 예시에서는 `required` 키워드로
`SuperClass`의 생성자를 필수로 지정했기 때문에 `SuperClass`의 모든 서브클래스는 `init(name:)` 생성자를 구현 해야하고,
덕분에 `SuperClass.Type` 메타타입으로 `init(name:)`을 호출할 수 있다. 이걸 활용하면 런타임에 조건에 따라 클래스 메타타입을 골라서
어떤 구체타입을 생성할지 동적으로 결정할 수 있다.

```swift
let myInstance = myClassType.init(name: "Doggo")
print(type(of: myInstance)) // prints SubClass
```

## 프로토콜의 메타타입들

이제 조금 헷갈리는 게 나온다. 프로토콜은 조금 다르다. 아래처럼 산책시킬 수 있는 동물들을 범주화하는 `Walkable` 프로토콜과, 산책시킬 수 있는 동물
`Dog`과 `Cat`(?)이 있다고 해보자. 산책 좋아하는 고양이도 있다.

```swift
enum RaceResult {
    case leftRunnerWon
    case rightRunnerWon
    case tie
}

// 산책시킬 수 있는 동물들의 프로토콜
protocol Walkable {
    // 산책할 수 있는 동물은 산책 중 경주도 시켜볼 수 있어야 한다.
    static func race(_ leftRunner: Self, _ rightRunner: Self) -> RaceResult
}

// 개는 산책을 좋아한다.
struct Dog: Walkable {
    // 경주에도 진심이다.
    static func race(_ leftRunner: Dog, _ rightRunner: Dog) -> RaceResult {
        Bool.random() ? .leftRunnerWon : .rightRunnerWon
    }
}

// 산책하는 고양이도 있다.
struct Cat: Walkable {
    // 하지만 경주에 관심있는 고양이는 없다.
    static func race(_ leftRunner: Cat, _ rightRunner: Cat) -> RaceResult {
        .tie
    }
}
```

서브타입 관계를 생각해보면 `any Walkable`에 `Dog`나 `Cat`의 인스턴스가 들어갈 수 있으니,
`(any Walkable).Type`에도 `Dog.self`, `Cat.self`가 들어갈 거라고 생각하기 쉽다. 하지만 시도해보면 컴파일 에러가 발생한다.

```swift
// ❌ Cannot convert value of type 'Cat.Type' to specified type '(any Walkable).Type'
let walkableType: (any Walkable).Type = Cat.self
```

왜 그럴까? 그건 바로 "포장 여부의 차이"에서 온다. 우리가 `var pet: any Walkable = Cat()`라고 적을 때 Swift는 암시적으로 `Cat` 인스턴스를
**existential container**라는 5 word 크기의 자료 구조에 집어넣는다. 박스에 포장된 고양이는 더이상 고양이가 아니다.
(물론 다시 꺼내놓으면 고양이로 돌아온다.) 메모리 레이아웃도 다르고, 무엇보다 고양이로 할 수 있는 일과 박스로 할 수 있는 일이 다르다.
그래서 `Cat.self`는 `(any Walkable).Type`의 원소가 아니다.

도대체 할 수 있는 일이 어떻게 달라지길래 안 끼워주는 걸까? `Cat` 인스턴스를 사부작 박스 안에 집어넣어 주는 것처럼, 타입도 적당히 박스에 집어넣어 주면
안되는 걸까? 개와 고양이를 한 번 경주시켜보면 박스에 갇힌 고양이와 박스 밖의 고양이의 차이를 이해할 수 있다.

```swift
let a: any Walkable = Dog()
let b: any Walkable = Cat()

// ❌ Static member 'race' cannot be used on protocol metatype '(any Walkable).Type'
(any Walkable).race(a, b)
```

`a` 상자 안에는 개가, `b` 상자 안에는 고양이가 들어있다. 우리는 `Walkable` 프로토콜의 `race` 메서드로 개와 고양이의 경주를 시키려고 하고 있다.
그런데 컴파일 에러가 발생한다. 프로토콜 메타타입으로는 `race`를 사용할 수 없다고 한다.

생각해보면 이 경주를 성사시킬 방법이 없는 이유는 명확하다. 우리가 개끼리의 경주, 고양이끼리의 경주 방법만 구현했을뿐 개와 고양이가 섞여있을 때의 경주 방법을
구현한 적은 없으니까, 실행시킬 코드 자체가 없다.

반면 아래와 같은 함수 안에서는 어떨까?

```swift
func festival<W: Walkable>(_ leftRunner: inout W, _ rightRunner: inout W) {
    // 1번 경기: 경주
    let raceResult = W.race(leftRunner, rightRunner)

    switch raceResult {
    case .leftRunnerWon:
        print("1번 주자가 이겼습니다!")
    case .rightRunnerWon:
        print("2번 주자가 이겼습니다!")
    case .tie:
        print("비겼습니다!")
    }

    // 2번 경기(?): 자리 바꾸기 놀이(?)
    swap(&leftRunner, &rightRunner)
}
```

이번에는 아무 문제가 없다. 똑같이 `Walkable` 프로토콜을 사용했지만 이번에는 `any Walkable`이라는 컨테이너로 동물을 포장한 게 아니라,
**`Walkable` 프로토콜을 따르는 어떤 동물 `W`가 있다**고 먼저 선언했기 때문이다. 따라서 `festival` 함수는 같은 동물로만 호출할 수 있고,
인자로 받은 `leftRunner`와 `rightRunner`가 항상 같은 동물이라는 것을 함수 본문 내에서 가정할 수 있다. 동물이 특정되었기 때문에
`W.race`라는 문법으로 어떤 동물 W의 경주 방식을 사용하라고 지시하고 있는 것이다.

이렇듯 박스로 한 번 감싸진 **포장된 프로토콜 타입**과 특정 프로토콜을 만족하는 걸 알고 있는 **어떤 타입**에는 큰 차이가 있다.
이 차이가 메타타입의 세계에서는 `(any Walkable).Type`과 `any Walkable.Type`이라는 형태로 표현된다.
새로 배운 `any Walkable.Type`에는 `Cat.self`가 들어가는지 확인해보자.

```swift
let pet: any Walkable.Type = Cat.self // ✨
```

이번에는 잘 들어간다. 마지막으로 그렇다면 `(any Walkable).Type`에는 대체 어떤 원소가 있을까? `Walkable`을 만족하는 동물들만 넣을 수 있는
5 word 크기의 상자 인스턴스들의 집합, `(any Walkable).self`가 바로 `(any Walkable).Type`의 유일한 원소이다.
바로 이 타입이 아까의 에러 메시지에서 봤던 프로토콜 메타타입이다.

정리하면 이렇다.

| | 타입 | 인스턴스 |
| - | - | - |
| 일반적인 타입 | `Int` | `7`, `42`, ... |
| 포장된 프로토콜 타입 | `any Walkable` | `Dog()`, `Cat()`, ... (암시적으로 포장됨) |
| 구체 타입의 메타타입 | `Int.Type` | `Int.self` |
| 클래스의 메타타입 | `SuperClass.Type` | `SuperClass.self`, `SubClass.self`, ... |
| "어떤 타입"의 메타타입 | `any Walkable.Type` | `Dog.self`, `Cat.self`, ... |
| 프로토콜 메타타입 | `(any Walkable).Type` | `(any Walkable).self` |

마지막으로 Swift 5.6에서 포장된 프로토콜 타입의 문법이 `Protocol`에서 `any Protocol`로 변경되었을 때
프로토콜과 관련된 두 메타타입을 생성하는 문법도 변경되었다. 과거의 이름은 각각 아래와 같다.
코드베이스에서 옛 이름을 발견한다면 새 이름으로 업데이트 해주는 게 좋겠다.

| | Swift 5.5 이하 |  Swift 5.6 이상 |
| - | - | - |
| "어떤 타입"의 메타타입 타입 | `Walkable.Type` | `any Walkable.Type` |
| "어떤 타입"의 메타타입 인스턴스 | `Dog.self` | `Dog.self` |
| 프로토콜 메타타입 타입 | `Walkable.Protocol` | `(any Walkable).Type` |
| 프로토콜 메타타입 인스턴스 | `Walkable.self` | `(any Walkable).self` |

## 결론

오늘은 Swift에서 메타프로그래밍을 하다보면 만나게 되는 메타타입에 대해 알아보았다.
특히 프로토콜과 관련된 메타타입들은 개념적으로도 타입 이론에 대한 이해를 요구하고,
중간에 한 번 문법까지 바뀌면서 정말이지 헷갈린다. 부디 이 자료가 이해에 도움이 되기를 바란다.
