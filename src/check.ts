/// <reference path="doc.ts" />

namespace rdml.check {

  export class CheckError implements Error {
    name: string = "Parameter Error";
    constructor(public message: string) { }
  }

  export function float(src: string, min: number | null, max: number | null): number {
    const f = parseFloat(src);
    if (isNaN(f)) {
      throw new CheckError(`cannot parse "${src}" as float value`);
    }
    if (min !== null) {
      if (f < min) { throw new CheckError(`expected param(${src}) >= min(${min})`); }
    }
    if (max !== null) {
      if (max < f) { throw new CheckError(`expected param(${src}) < max(${max})`); }
    }
    return f;
  }

  export function int(src: string, min: number | null, max: number | null): number {
    const f = float(src, min, max);
    const i = parseInt(src);
    if (i !== f) {
      throw new CheckError(`"${src}" is not integer"`);
    }
    return i;
  }
}
