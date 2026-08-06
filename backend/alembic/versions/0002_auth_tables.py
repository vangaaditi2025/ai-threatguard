"""add auth tables

Revision ID: 0002_auth_tables
Revises: 0001_initial
Create Date: 2026-08-05 00:30:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0002_auth_tables'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade():
    # add columns to users
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('users', sa.Column('is_superuser', sa.Boolean(), nullable=False, server_default=sa.text('false')))

    # roles
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=50), nullable=False, unique=True),
    )

    # association table user_roles
    op.create_table(
        'user_roles',
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE')),
        sa.Column('role_id', sa.Integer(), sa.ForeignKey('roles.id', ondelete='CASCADE')),
    )

    # refresh tokens
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token', sa.String(length=512), nullable=False, unique=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
    )

    # email verifications
    op.create_table(
        'email_verifications',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token', sa.String(length=512), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )

    # password resets
    op.create_table(
        'password_resets',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token', sa.String(length=512), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
    )

    # oauth accounts
    op.create_table(
        'oauth_accounts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('provider_user_id', sa.String(length=255), nullable=False),
        sa.Column('extra_data', sa.String(length=1024), nullable=True),
    )


def downgrade():
    op.drop_table('oauth_accounts')
    op.drop_table('password_resets')
    op.drop_table('email_verifications')
    op.drop_table('refresh_tokens')
    op.drop_table('user_roles')
    op.drop_table('roles')
    op.drop_column('users', 'is_superuser')
    op.drop_column('users', 'is_active')
