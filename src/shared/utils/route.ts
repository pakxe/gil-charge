/**
 * URL 경로 문자열에서 dynamic parameter(:param)의 이름만 union으로 추출합니다.
 * 타입 추론을 이용하여 인자 타입같은걸 안적을 수 있도록 합니다.
 * * @example
 * type T1 = ExtractParams<"/user/:id">; // "id"
 * type T2 = ExtractParams<"/post/:postId/comment/:commentId">; // "postId" | "commentId"
 * type T3 = ExtractParams<"/">; // never
 */
type ExtractParams<P extends string> = P extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<Rest>
    : P extends `${string}:${infer Param}`
      ? Param
      : never;

/**
 * 추출된 parameter들로 함수의 arguments 타입을 결정합니다.
 * - parameter가 없으면 인자를 받지 않습니다. `()`
 * - parameter가 있으면 해당 parameter들을 필수로 포함하는 객체를 인자로 받습니다. `(params: {...})`
 */
type ParamsArg<P extends string> = [ExtractParams<P>] extends [never]
    ? []
    : [params: { [K in ExtractParams<P>]: string | number }];

type Path = string;

export const PATHS = {
    home: "/",
    pomo: "/pomo",
    showMapPoc: "/poc/show-map",
    selectSearchType: "/select-search-type",

    // TODO: 아래는 예시를 위한 path이므로 익숙해지면 제거해라.
    userDetail: "/user/:id",
    postComment: "/post/:postId/comment/:commentId",
} as const;

type PathKeys = keyof typeof PATHS;

/**
 * path에 있는 dynamic parameter를 실제 값으로 치환합니다.
 */
const generateLink = (path: string, params: Record<string, string | number>) => {
    return Object.entries(params).reduce((acc, [key, val]) => acc.replace(`:${key}`, String(val)), path);
};

/**
 * type-safe한 link 생성기입니다.
 * * @example
 * linkTo.home(); // "/"
 * linkTo.userDetail({ id: 1 }); // "/user/1"
 */
export const linkTo: {
    [K in PathKeys]: (...args: ParamsArg<(typeof PATHS)[K]>) => Path;
} = {
    home: () => PATHS.home,
    pomo: () => PATHS.pomo,
    showMapPoc: () => PATHS.showMapPoc,
    selectSearchType: () => PATHS.selectSearchType,
    userDetail: (args) => generateLink(PATHS.userDetail, args),
    postComment: (args) => generateLink(PATHS.postComment, args),
};
