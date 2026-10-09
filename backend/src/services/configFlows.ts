import { createConfigFlows } from "../modules/configs";
import { ConfigService } from "./ConfigService";
import { closureValidationService } from "./closureValidationService";
import { companyPolicyStorage } from "./companyPolicyStorage";
import { brandLogoStorage } from "./brandLogoStorage";
export const configFlows = createConfigFlows({
  get: (key, role) => ConfigService.get(key, role),
  list: (role) => ConfigService.list(role),
  set: (key, value, actor) => ConfigService.set(key, value, actor),
  replacePolicy: async (value, actor) =>
    (await ConfigService.replace("company_policy_meta", value, actor)).previousValue,
  validateFile: (file) => companyPolicyStorage.validate(file),
  download: (meta) => companyPolicyStorage.download(meta),
  removeFile: (filename) => companyPolicyStorage.remove(filename),
  validateLogoFile: (file) => brandLogoStorage.validate(file),
  downloadLogo: (meta) => brandLogoStorage.download(meta),
  removeLogoFile: (filename) => brandLogoStorage.remove(filename),
  time: () => ConfigService.getServerTime(),
  closure: (date) => closureValidationService.validateManualClosure(date),
  now: () => new Date().toISOString(),
});
