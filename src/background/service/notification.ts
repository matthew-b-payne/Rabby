import Events from 'events';
import { ethErrors } from 'eth-rpc-errors';
import { EthereumProviderError } from 'eth-rpc-errors/dist/classes';
import { winMgr } from 'background/webapi';
import {
  CHAINS,
  IS_CHROME,
  IS_LINUX,
  KEYRING_TYPE,
  NOT_CLOSE_UNFOCUS_LIST,
} from 'consts';
import preferenceService from './preference';

interface Approval {
  data: {
    state: number;
    params?: any;
    origin?: string;
    approvalComponent: string;
    requestDefer?: Promise<any>;
    approvalType: string;
  };
  resolve(params?: any): void;
  reject(err: EthereumProviderError<any>): void;
}

// something need user approval in window
// should only open one window, unfocus will close the current notification
class NotificationService extends Events {
  approval: Approval | null = null;
  notifiWindowId = 0;
  isLocked = false;

  constructor() {
    super();

    winMgr.event.on('windowRemoved', (winId: number) => {
      if (winId === this.notifiWindowId) {
        this.notifiWindowId = 0;
      }
    });

    winMgr.event.on('windowFocusChange', (winId: number) => {
      const account = preferenceService.getCurrentAccount()!;
      if (this.notifiWindowId && winId !== this.notifiWindowId) {
        if (process.env.NODE_ENV === 'production') {
          if (
            (IS_CHROME &&
              winId === chrome.windows.WINDOW_ID_NONE &&
              IS_LINUX) ||
            (account?.type === KEYRING_TYPE.WalletConnectKeyring &&
              NOT_CLOSE_UNFOCUS_LIST.includes(account.brandName))
          ) {
            // Wired issue: When notification popuped, will focus to -1 first then focus on notification
            return;
          }
          this.rejectApproval();
        }
      }
    });
  }

  getApproval = () => this.approval?.data;

  resolveApproval = (data?: any, forceReject = false) => {
    if (forceReject) {
      this.approval?.reject(new EthereumProviderError(4001, 'User Cancel'));
    } else {
      this.approval?.resolve(data);
    }
    this.approval = null;
    this.emit('resolve', data);
  };

  rejectApproval = async (err?: string, stay = false, isInternal = false) => {
    if (isInternal) {
      this.approval?.reject(ethErrors.rpc.internal(err));
    } else {
      this.approval?.reject(ethErrors.provider.userRejectedRequest<any>(err));
    }

    await this.clear(stay);
    this.emit('reject', err);
  };

  // currently it only support one approval at the same time
  requestApproval = async (data, winProps?): Promise<any> => {
    // if the request comes into while user approving
    if (this.approval) {
      throw ethErrors.provider.userRejectedRequest(
        'please request after current approval resolve'
      );
    }

    // if (preferenceService.getPopupOpen()) {
    //   this.approval = null;
    //   throw ethErrors.provider.userRejectedRequest(
    //     'please request after user close current popup'
    //   );
    // }

    return new Promise((resolve, reject) => {
      this.approval = {
        data,
        resolve,
        reject,
      };

      if (
        ['wallet_switchEthereumChain', 'wallet_addEthereumChain'].includes(
          data?.params?.method
        )
      ) {
        const chainId = data.params?.data?.[0]?.chainId;
        const chain = Object.values(CHAINS).find(
          (chain) => chain.hex === chainId
        );
        if (chain) {
          this.resolveApproval(null);
          return;
        }
      }
      this.openNotification(winProps);
    });
  };

  clear = async (stay = false) => {
    this.approval = null;
    if (this.notifiWindowId && !stay) {
      await winMgr.remove(this.notifiWindowId);
      this.notifiWindowId = 0;
    }
  };

  unLock = () => {
    this.isLocked = false;
  };

  lock = () => {
    this.isLocked = true;
  };

  openNotification = (winProps) => {
    if (this.isLocked) return;
    this.lock();
    if (this.notifiWindowId) {
      winMgr.remove(this.notifiWindowId);
      this.notifiWindowId = 0;
    }
    winMgr.openNotification(winProps).then((winId) => {
      this.notifiWindowId = winId!;
    });
  };
}

export default new NotificationService();
