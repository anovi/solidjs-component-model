export class DomainPath {
  readonly value: string;
  readonly extname: string;

  private constructor(value: string) {
    this.value = value;
    this.extname = "";
  }

  static fromDomain(value: string): DomainPath {
    return new DomainPath(value);
  }

  static fromPersistence(value: string): DomainPath {
    let result = value;
    if (result.endsWith("/index.md")) result = result.slice(0, -9);
    if (result.endsWith(".md")) result = result.slice(0, -3);
    return new DomainPath(result);
  }

  static fromAbsolute(absolute: string) {
    return new DomainPath(absolute);
  }

  equals(other: DomainPath): boolean {
    return this.value === other.value;
  }

  toPagePersistence(options?: { isIndexPage?: boolean }): string {
    const suffix = options?.isIndexPage ? "/index" : "";
    return `${this.value}${suffix}.md`.replace("//", "/");
  }

  toUnitPersistence(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
