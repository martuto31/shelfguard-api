import CustomError from './../utils/custom-error.util';

import { Organization, OrganizationDoc, IOrganization } from './../models/organization.model';

export default class OrganizationDataLayer {

  private logContext = 'Organization Data Layer';

  public async create(data: Partial<IOrganization>, logContext: string): Promise<OrganizationDoc> {
    logContext = `${logContext} -> ${this.logContext} -> create()`;

    return await Organization.create(data)
      .catch(err => {
        throw new CustomError(500, err.message, `${logContext} -> data: ${JSON.stringify(data)}`);
      });
  }

  private static instance: OrganizationDataLayer;

  public static getInstance(): OrganizationDataLayer {
    if (!OrganizationDataLayer.instance) {
      OrganizationDataLayer.instance = new OrganizationDataLayer();
    }

    return OrganizationDataLayer.instance;
  }

}
