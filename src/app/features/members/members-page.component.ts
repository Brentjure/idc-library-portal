import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { AlertComponent } from '../../components/alert/alert.component';
import { ChoiceChipsComponent, ChoiceOption } from '../../components/choice-chips/choice-chips.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../components/icon/icon.component';
import { MemberLineComponent } from '../../components/member-line/member-line.component';
import { ToastService } from '../../components/toast/toast.service';
import { errorMessage } from '../../core/api/api-client.service';
import { MembersApi } from '../../core/api/members.api';
import { AuthService } from '../../core/auth/auth.service';
import { Loan } from '../../core/models/loan.model';
import { DirectoryMember, MemberDetail } from '../../core/models/member.model';
import { formatDayMonth, today } from '../../utils/dates';
import { formatPhone, plural } from '../../utils/format';
import { MAX_BOOKS_PER_MEMBER } from '../desk/desk-rules';
import { DeskService } from '../desk/desk.service';
import { MemberDrawerComponent, MemberDrawerRequest } from './member-drawer/member-drawer.component';
import { MemberFilter, MemberSort, NO_GROUP, filterMembers, groupCounts, memberStats, sortMembers } from './member-directory';

const FILTERS: ChoiceOption<MemberFilter>[] = [
  { value: 'active', label: 'Active' },
  { value: 'overdue', label: 'Has overdue' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'all', label: 'All' },
];

const SORTS: { value: MemberSort; label: string }[] = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'onLoan', label: 'Most books out' },
  { value: 'recent', label: 'Recently joined' },
];

/**
 * Every member (admin only): totals, search by name or phone, group chips, filters and sort.
 * A row opens the member drawer; the green pencil opens it on the edit form.
 */
@Component({
  selector: 'app-members-page',
  imports: [AlertComponent, ChoiceChipsComponent, ConfirmDialogComponent, IconComponent, MemberLineComponent, MemberDrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './members-page.component.html',
  host: { class: 'flex flex-col gap-[18px]' },
})
export class MembersPageComponent {
  protected readonly auth = inject(AuthService);
  private readonly desk = inject(DeskService);
  private readonly membersApi = inject(MembersApi);
  private readonly toast = inject(ToastService);

  protected readonly members = signal<DirectoryMember[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly query = signal('');
  protected readonly group = signal<string | null>(null);
  protected readonly filter = signal<MemberFilter>('active');
  protected readonly sort = signal<MemberSort>('name');

  protected readonly drawerRequest = signal<MemberDrawerRequest | null>(null);

  /** The member being removed: confirm, or explain why it can't be done yet. */
  protected readonly removing = signal<MemberDetail | null>(null);
  protected readonly removeBusy = signal(false);
  protected readonly removeError = signal('');

  protected readonly filters = FILTERS;
  protected readonly sorts = SORTS;
  protected readonly maxBooks = MAX_BOOKS_PER_MEMBER;

  private readonly today = today();
  protected readonly stats = computed(() => memberStats(this.members(), this.today));
  protected readonly chips = computed(() => groupCounts(this.members()));
  /** For the group suggestions in the form. */
  protected readonly groupNames = computed(() => this.chips().map((c) => c.name).filter((n) => n !== NO_GROUP));
  protected readonly rows = computed(() =>
    sortMembers(filterMembers(this.members(), { query: this.query(), group: this.group(), filter: this.filter() }), this.sort()).map(
      (member) => ({
        member,
        phone: member.phone ? formatPhone(member.phone) : 'No phone saved',
        slots: Array.from({ length: MAX_BOOKS_PER_MEMBER }, (_, i) => i < member.onLoanCount),
      }),
    ),
  );
  protected readonly isFiltered = computed(() => !!this.query().trim() || this.group() !== null || this.filter() !== 'all');

  protected readonly removeHeading = computed(() => {
    const d = this.removing();
    if (!d) return '';
    if (d.member.onLoanCount > 0) return `${d.member.fullName} can’t be removed yet`;
    return d.hasHistory ? `Deactivate ${d.member.fullName}?` : `Delete ${d.member.fullName}?`;
  });

  protected readonly plural = plural;
  protected readonly formatDayMonth = formatDayMonth;

  private readonly drawer = viewChild(MemberDrawerComponent);

  constructor() {
    // Load now, and again whenever a desk drawer saves (loans and returns change the counts).
    effect(() => {
      this.desk.changes();
      untracked(() => {
        void this.load();
        void this.drawer()?.reload();
      });
    });
  }

  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected setSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as MemberSort);
  }

  protected clearFilters(): void {
    this.query.set('');
    this.group.set(null);
    this.filter.set('all');
  }

  protected open(member: DirectoryMember, editing = false): void {
    this.drawerRequest.set({ mode: editing ? 'edit' : 'view', id: member.id });
  }

  protected add(): void {
    this.drawerRequest.set({ mode: 'add' });
  }

  protected closeDrawer(): void {
    this.drawerRequest.set(null);
  }

  protected lend(member: DirectoryMember): void {
    this.closeDrawer();
    this.desk.openBorrow(null, member);
  }

  protected returnBook(loan: Loan): void {
    this.desk.openReturn({
      memberId: loan.memberId,
      memberName: loan.memberName,
      memberPhone: loan.memberPhone,
      transactionId: loan.transactionId,
    });
  }

  protected askRemove(detail: MemberDetail): void {
    this.removeError.set('');
    this.removing.set(detail);
  }

  protected cancelRemove(): void {
    this.removing.set(null);
  }

  protected async confirmRemove(): Promise<void> {
    const detail = this.removing();
    if (!detail || this.removeBusy()) return;
    this.removeBusy.set(true);
    this.removeError.set('');
    try {
      const { outcome } = await this.membersApi.remove(detail.member.id);
      this.removing.set(null);
      if (outcome === 'DELETED') {
        this.closeDrawer();
        this.toast.show(`Deleted ${detail.member.fullName}.`);
      } else {
        this.toast.show(`Deactivated ${detail.member.fullName}. Their history is kept.`);
        void this.drawer()?.reload();
      }
      await this.load();
    } catch (err) {
      // Most likely they borrowed a book meanwhile: say why, with the fresh numbers.
      this.removeError.set(errorMessage(err, 'Couldn’t remove the member. Please try again.'));
      try {
        this.removing.set(await this.membersApi.detail(detail.member.id));
      } catch {
        // Keep what we have.
      }
    } finally {
      this.removeBusy.set(false);
    }
  }

  protected async load(): Promise<void> {
    this.error.set('');
    try {
      this.members.set(await this.membersApi.directory());
    } catch (err) {
      this.error.set(errorMessage(err, 'Couldn’t load the members. Please try again.'));
    } finally {
      this.loading.set(false);
    }
  }
}
