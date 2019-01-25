/// <reference path="rdml.ts" />
/// <reference path="parser.ts" />

namespace rdml {

  interface Converter {
    convert: (src: string) => Param;
  }

  namespace conv {
    export class Fixed {
      constructor(private param: Param) { }
      convert(src: string) { return this.param; }
    }

    export class Int {
      constructor(
        private min: number,
        private max: number,
      ) { }
      convert(src: string) { return parseInt(src); }
    }

    export class Match {
      constructor(private cases: { [name: string]: Converter }) { }
      convert(src: string) {
        if (src in this.cases) {
          return this.cases[src].convert("");
        }
        return this.cases[""].convert(src);
      }
    }
  }

  interface unit {
    desc: string;
    converter: Converter;
  }

  const units: { [name: string]: unit } = {
    id: {
      desc: "ID",
      converter: new conv.Int(0, 10),
    },
    idBased1: {
      desc: "1以上のID",
      converter: new conv.Match({
        "all": new conv.Fixed(-2),
        "": new conv.Int(1, 10),
      }),
    },
    time: {
      desc: "フレーム数",
      converter: new conv.Int(0, 100),
    },
  }

  const REQUIRED = null;

  const hogeCmd = {
    __alts: ["fuga"],
    __dataAttr: "type",

    rdmlParams: {
      "type": {
        unit: units.id,
        desc: "天候タイプ",
        default: REQUIRED,
      },
      time: {
        unit: units.time,
        desc: "フェードイン時間",
        default: 60,
      },
    },

    tkoolParams: {
      0: { ref: "type" },
      1: { ref: "time" },
      2: { ref: "scale", index: 0 },
    }
  }

  // converting mock
  function hoge() {
    const el = new Element();
    const cmd = hogeCmd;
    const ps = cmd.rdmlParams;
    const value = el.attrs["type"]; // oops.
    const out = ps["type"].unit.converter.convert(value);
    // ここで一旦キー=>パラメータのオブジェクトに詰める
    // その後tkoolParamsに詰め替える
  }
}
