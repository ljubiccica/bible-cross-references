export interface LicenseInfo {
  /** Short license name, e.g. `CC BY 4.0` or `Public domain`. */
  readonly name: string;
  readonly url: string;
  /**
   * Whether the work is in the public domain, in which case crediting it is a courtesy and a
   * narrow screen may leave it out. Anything else names its licence on every copy that is
   * distributed, so it stays. Absent means it stays: forgetting this should cost a little room,
   * not a licence condition.
   */
  readonly publicDomain?: boolean;
}
