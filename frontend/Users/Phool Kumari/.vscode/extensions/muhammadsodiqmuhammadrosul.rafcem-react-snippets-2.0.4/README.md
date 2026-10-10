# rafcem-react-snippets

A collection of React snippets with `memo` and PascalCase support for faster component creation.

## Features

- React functional components wrapped with `memo`
- PascalCase component naming based on file name
- Support for both **JavaScript (JSX)** and **TypeScript (TSX)**
- Includes commonly used hooks snippets

## Installation

1. Open **Extensions** view in VS Code (`Ctrl+Shift+X` or `Cmd+Shift+X` on Mac).
2. Search for **rafcem-react-snippets**.
3. Click **Install**.

## Usage

Open a `.jsx` or `.tsx` file and type one of the snippet prefixes, then press `Tab`.

## Snippets

### `rafcem` – React Functional Component with Memo (JavaScript/TypeScript)

**Prefix:** `rafcem`  
**Description:** Generates a React functional component wrapped with `memo`. Supports both JavaScript and TypeScript files. The component name is derived from the file name in PascalCase.

**Output when you type `rafcem` and press Tab:**

```tsx
import { memo } from "react";

const MyComponent = () => {
  return (
    <div>
      <h2>MyComponent</h2>
    </div>
  );
};

export default memo(MyComponent);
```

---

### `rafcemt` – React Functional Component with Typed Props and Memo (TypeScript)

**Prefix:** `rafcemt`  
**Description:** Generates a typed React functional component with props interface and wrapped with `memo`. Designed for `.tsx` files.

**Output when you type `rafcemt` and press Tab:**

```tsx
import { memo, type FC } from "react";

interface MyComponentProps {
  // props go here
}

const MyComponent: FC<MyComponentProps> = (props) => {
  return (
    <div>
      <h2>MyComponent</h2>
    </div>
  );
};

export default memo(MyComponent);
```

---

### `rame` – React Arrow Function Component with Memo (JavaScript)

**Prefix:** `rame`  
**Description:** Creates a React functional component using arrow function syntax wrapped with `memo` for JavaScript files.

**Output when you type `rame` and press Tab:**

```jsx
import { memo } from "react";

export const MyComponent = memo(() => {
  return (
    <div>
      <h2>MyComponent</h2>
    </div>
  );
});
```

---

### `ramet` – React Arrow Function Component with Typed Props and Memo (TypeScript)

**Prefix:** `ramet`  
**Description:** Creates a typed React arrow function component with props interface wrapped with `memo` for TypeScript files.

**Output when you type `ramet` and press Tab:**

```tsx
import { memo } from "react";
import type { FC } from "react";

interface MyComponentProps {
  // props go here
}

export const MyComponent: FC<MyComponentProps> = memo((props) => {
  return (
    <div>
      <h2>MyComponent</h2>
    </div>
  );
});
```

---

### `us` – useState Hook Snippet

**Prefix:** `us`  
**Description:** Generates a `useState` hook declaration with state variable and setter.

**Output when you type `us` and press Tab:**

```tsx
const [count, setCount] = useState();
```

---

### `ud` – useDispatch Hook Snippet

**Prefix:** `ud`  
**Description:** Generates a `useDispatch` hook declaration.

**Output when you type `ud` and press Tab:**

```tsx
const dispatch = useDispatch();
```

---

## Contribution

We welcome contributions! If you have ideas for new snippets, bug fixes, or improvements, please open an issue or submit a pull request on the [GitHub repository](https://github.com/muhammadsodiq1429/rafcem-react-snippets). Your feedback and help are highly appreciated.

## Support / Donate

If this extension is useful for you, you can support the author.

Visa (UZ):
4916 9903 0894 2645  
Name: Muhammadsodiq Muhammadjonov

UZCARD (UZ):
5614 6824 1642 1586
Name: Muhammadsodiq Muhammadjonov
