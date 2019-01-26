/// <reference path="rdml.ts" />
/// <reference path="parser.ts" />
/// <reference path="check.ts" />

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
        private min: number | null,
        private max: number | null,
      ) { }
      convert(src: string) { return check.int(src, this.min, this.max); }
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
      converter: new conv.Int(0, null),
    },
    idBased1: {
      desc: "1以上のID",
      converter: new conv.Match({
        "all": new conv.Fixed(-2),
        "": new conv.Int(1, null),
      }),
    },
    actorID: {
      desc: "アクターID",
      converter: new conv.Match({
        "all": new conv.Fixed(0),
        "": new conv.Int(1, null),
      }),
    },
    time: {
      desc: "フレーム数",
      converter: new conv.Int(0, null),
    },
  }

  interface rdmlParam {
    unit: unit;
    desc: string;
    default: Param | null;
  }

  interface tkoolParam {
    ref: string;
    index?: number;
  }

  interface command {
    aliases: string[];
    dataAttr: string;
    rdmlParams: rdmlParam[];
    tkoolParams: tkoolParam[];
  }

  const REQUIRED = null;

  const commands: { [name: string]: command } = {
    wait: {
      aliases: [],
      dataAttr: "time",
      rdmlParams: [
        {
          unit: units.time,
          desc: "ウェイト時間",
          default: 60,
        },
      ],
      tkoolParams: [
        { ref: "time" },
      ],
    },
  };

  const hogeCmd = {
    alts: ["fuga"],
    dataAttr: "type",
    params: [
      {
        unit: units.actorID,
        desc: "天候タイプ",
        default: REQUIRED,
      },
    ],

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
    } as { [id: number]: any },
  }

  // converting mock
  function hoge() {
    const el = new Element();
    const cmd = hogeCmd;
    const ps = cmd.rdmlParams;
    const value = el.attrs["type"]; // oops.
    const out = ps["type"].unit.converter.convert(value);
    // ここで一旦キー=>パラメータのオブジェクトに詰める
    const results = {
      "type": out,
    };
    // その後tkoolParamsに詰め替える
    const tps = cmd.tkoolParams;
    let params: Param[] = [];
    for (const index in tps) {
      const tp = tps[index];
      params[index] = results["type"];
    }
  }
}
