import { createPersistStore } from 'background/utils';

export interface ContactBookItem {
  name: string;
  address: string;
  isAlias: boolean;
  isContact: boolean;
}

export interface UIContactBookItem {
  name: string;
  address: string;
}

export type ContactBookStore = Record<string, ContactBookItem | undefined>;

class ContactBook {
  store!: ContactBookStore;
  cache: ContactBookStore = {};

  init = async () => {
    this.store = await createPersistStore<ContactBookStore>({
      name: 'contactBook',
      template: {},
    });
  };

  getContactByAddress = (address: string) => {
    const contact = this.store[address.toLowerCase()];
    if (contact) {
      return {
        ...contact,
        address: contact.address.toLowerCase(),
      };
    }
    return contact;
  };

  removeContact = (address: string) => {
    const key = address.toLowerCase();
    if (!this.store[key]) return;
    if (this.store[key]?.isAlias) {
      this.store[key] = Object.assign({}, this.store[key], {
        isContact: false,
      });
    } else {
      delete this.store[key];
    }
  };

  updateContact = (data: ContactBookItem) => {
    if (this.store[data.address.toLowerCase()]) {
      this.store[data.address.toLowerCase()] = Object.assign(
        {},
        this.store[data.address.toLowerCase()],
        {
          name: data.name,
          address: data.address.toLowerCase(),
          isContact: true,
        }
      );
    } else {
      this.store[data.address.toLowerCase()] = {
        name: data.name,
        address: data.address.toLowerCase(),
        isContact: true,
        isAlias: false,
      };
    }
  };

  addContact = this.updateContact;

  listContacts = (): ContactBookItem[] => {
    const list = Object.values(this.store);
    return (
      list
        .map((item) => ({
          ...item,
          address: item?.address.toLowerCase(),
        }))
        .filter((item): item is ContactBookItem => !!item?.isContact) || []
    );
  };

  listAlias = () => {
    return Object.values(this.store)
      .map((item) => ({
        ...item,
        address: item?.address.toLowerCase(),
      }))
      .filter((item) => item?.isAlias);
  };

  updateAlias = (data: { address: string; name: string }) => {
    const key = data.address.toLowerCase();
    if (this.store[key]) {
      this.store[key] = Object.assign({}, this.store[key], {
        name: data.name,
        address: data.address.toLowerCase(),
        isAlias: true,
      });
    } else {
      this.store[key] = {
        name: data.name,
        address: data.address.toLowerCase(),
        isAlias: true,
        isContact: false,
      };
    }
  };

  addAlias = this.updateAlias;

  removeAlias = (address: string) => {
    const key = address.toLowerCase();
    if (!this.store[key]) return;
    if (this.store[key]!.isContact) {
      this.store[key]! = Object.assign({}, this.store[key], {
        isAlias: false,
      });
    } else {
      delete this.store[key];
    }
  };

  getContactsByMap = () => {
    Object.values(this.store)
      .filter((item) => item?.isContact)
      .reduce(
        (res, item) => ({
          ...res,
          [item!.address.toLowerCase()]: {
            ...item,
            address: item?.address.toLowerCase(),
          },
        }),
        {}
      );
    return this.store;
  };

  getCacheAlias = (address: string) => {
    return this.cache[address.toLowerCase()];
  };

  updateCacheAlias = (data: { address: string; name: string }) => {
    const key = data.address.toLowerCase();
    this.cache[key] = {
      name: data.name,
      address: data.address.toLowerCase(),
      isAlias: true,
      isContact: false,
    };
  };

  removeCacheAlias = (address: string) => {
    const key = address.toLowerCase();
    delete this.cache[key];
  };
}

export default new ContactBook();
