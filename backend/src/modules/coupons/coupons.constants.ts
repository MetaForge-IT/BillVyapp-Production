export const COUPON_TYPE = {
  PERCENTAGE: "percentage",
  FLAT: "flat",
} as const;

export type CouponType = (typeof COUPON_TYPE)[keyof typeof COUPON_TYPE];

export const COUPON_STATUS = {
  ACTIVE: "active",
  EXPIRED: "expired",
  DISABLED: "disabled",
} as const;

export type CouponStatus = (typeof COUPON_STATUS)[keyof typeof COUPON_STATUS];

export const COUPON_ERROR_CODES = {
  NOT_FOUND: "COUPON_NOT_FOUND",
  DUPLICATE_CODE: "COUPON_DUPLICATE_CODE",
} as const;

export function mapCouponTypeFromDb(dbType: string): CouponType {
  return dbType === COUPON_TYPE.FLAT ? COUPON_TYPE.FLAT : COUPON_TYPE.PERCENTAGE;
}

export function mapCouponTypeToDb(apiType: CouponType): string {
  return apiType;
}
